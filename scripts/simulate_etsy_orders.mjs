#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    const key = s.slice(0, i).trim();
    const value = s.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = {
    count: 10,
    prefix: 'ETSY-',
    startAt: 1000,
    codes: '',
    env: '.env'
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') out.count = Number(argv[++i] || out.count);
    else if (a === '--prefix') out.prefix = argv[++i] || out.prefix;
    else if (a === '--start-at') out.startAt = Number(argv[++i] || out.startAt);
    else if (a === '--codes') out.codes = argv[++i] || '';
    else if (a === '--env') out.env = argv[++i] || out.env;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(path.resolve(process.cwd(), args.env));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_ORDERS_TABLE || 'orders';

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  if (!serviceRole) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const codes = args.codes
    ? args.codes.split(',').map((x) => x.trim()).filter(Boolean)
    : Array.from({ length: args.count }, (_, i) => `${args.prefix}${args.startAt + i}`);

  if (codes.length === 0) {
    console.log('No codes to insert.');
    return;
  }

  const rows = codes.map((order_code) => ({
    order_code,
    status: 'pending'
  }));

  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: 'order_code', ignoreDuplicates: false })
    .select('order_code,status');

  if (error) throw error;

  console.log(`Inserted/updated ${data?.length || 0} simulated Etsy orders into '${table}':`);
  for (const row of data || []) {
    console.log(`- ${row.order_code} (${row.status})`);
  }
}

main().catch((err) => {
  console.error('[simulate_etsy_orders] failed:', err.message || err);
  process.exit(1);
});
