#!/usr/bin/env node
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_ENV_FILE = '.env';
const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
const DEFAULT_COLOR_KEY = 'purple_gloss';
const DEFAULT_CACHE_TABLE = 'ai_text_design_cache';
const DEFAULT_STORAGE_FOLDER = 'ai-text-design-cache';
const DEFAULT_UPLOAD_CONCURRENCY = 8;
const DEFAULT_DB_BATCH_SIZE = 500;
const DEFAULT_MAX_IMAGE_BYTES = 15_000_000;

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

function printUsageAndExit(code = 0) {
  const usage = `
Usage:
  node scripts/import_ai_text_design_cache.mjs --input-dir <dir> [options]

Required:
  --input-dir <dir>                Directory that contains generated PNG files.

Options:
  --env <path>                     Env file to load (default: .env)
  --ext <exts>                     Comma separated extensions (default: .png)
  --recursive                      Scan subfolders recursively
  --model <name>                   Model metadata (default: gemini-3.1-flash-image-preview)
  --color-key <key>                Color metadata (default: purple_gloss)
  --design-name <name>             Fixed design_name for all rows
  --target-prefix <text>           Prefix added to derived target text
  --upload-concurrency <n>         Parallel uploads (default: 8)
  --db-batch-size <n>              DB upsert batch size (default: 500)
  --max-image-bytes <n>            Max file size allowed (default: 15000000)
  --bucket <name>                  Storage bucket (default: SUPABASE_AI_TEXT_CACHE_BUCKET or SUPABASE_STORAGE_BUCKET or generated-maps)
  --folder <path>                  Storage folder (default: ai-text-design-cache)
  --table <name>                   DB table (default: ai_text_design_cache)
  --dry-run                        Do not upload or write DB; print summary only
  --help                           Show this help

Examples:
  node scripts/import_ai_text_design_cache.mjs --input-dir /tmp/out --recursive
  node scripts/import_ai_text_design_cache.mjs --input-dir /tmp/out --design-name "Varsity v2" --color-key royal_blue_gloss
`.trim();
  console.log(usage);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    env: DEFAULT_ENV_FILE,
    inputDir: '',
    ext: '.png',
    recursive: false,
    model: DEFAULT_MODEL,
    colorKey: DEFAULT_COLOR_KEY,
    designName: '',
    targetPrefix: '',
    uploadConcurrency: DEFAULT_UPLOAD_CONCURRENCY,
    dbBatchSize: DEFAULT_DB_BATCH_SIZE,
    maxImageBytes: DEFAULT_MAX_IMAGE_BYTES,
    bucket: '',
    folder: DEFAULT_STORAGE_FOLDER,
    table: DEFAULT_CACHE_TABLE,
    dryRun: false
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') printUsageAndExit(0);
    else if (a === '--env') args.env = argv[++i] || args.env;
    else if (a === '--input-dir') args.inputDir = argv[++i] || args.inputDir;
    else if (a === '--ext') args.ext = argv[++i] || args.ext;
    else if (a === '--recursive') args.recursive = true;
    else if (a === '--model') args.model = (argv[++i] || args.model).trim();
    else if (a === '--color-key') args.colorKey = (argv[++i] || args.colorKey).trim();
    else if (a === '--design-name') args.designName = (argv[++i] || '').trim();
    else if (a === '--target-prefix') args.targetPrefix = (argv[++i] || '').trim();
    else if (a === '--upload-concurrency') args.uploadConcurrency = Number(argv[++i] || args.uploadConcurrency);
    else if (a === '--db-batch-size') args.dbBatchSize = Number(argv[++i] || args.dbBatchSize);
    else if (a === '--max-image-bytes') args.maxImageBytes = Number(argv[++i] || args.maxImageBytes);
    else if (a === '--bucket') args.bucket = (argv[++i] || '').trim();
    else if (a === '--folder') args.folder = (argv[++i] || args.folder).trim();
    else if (a === '--table') args.table = (argv[++i] || args.table).trim();
    else if (a === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }

  if (!args.inputDir) throw new Error('--input-dir is required');
  if (!Number.isFinite(args.uploadConcurrency) || args.uploadConcurrency < 1) {
    throw new Error('--upload-concurrency must be >= 1');
  }
  if (!Number.isFinite(args.dbBatchSize) || args.dbBatchSize < 1) {
    throw new Error('--db-batch-size must be >= 1');
  }
  if (!Number.isFinite(args.maxImageBytes) || args.maxImageBytes < 1024) {
    throw new Error('--max-image-bytes must be >= 1024');
  }
  if (!args.model) throw new Error('--model is required');
  if (!args.colorKey) throw new Error('--color-key is required');
  if (!args.folder) throw new Error('--folder is required');
  if (!args.table) throw new Error('--table is required');
  return args;
}

function toSlug(value, fallback = 'text') {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || fallback;
}

function normalizeTargetText(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeColorKey(value) {
  return value.trim().toLowerCase();
}

function buildCacheKey(model, targetText, colorKey) {
  return `${model.trim()}::${normalizeTargetText(targetText)}::${normalizeColorKey(colorKey)}`;
}

function parseExtensions(rawExt) {
  return rawExt
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .map((x) => (x.startsWith('.') ? x : `.${x}`));
}

async function listFiles(dir, recursive, extSet) {
  const out = [];
  async function walk(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) await walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (extSet.has(ext)) out.push(abs);
    }
  }
  await walk(dir);
  return out.sort((a, b) => a.localeCompare(b));
}

function inferContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return { ext: 'png', contentType: 'image/png' };
  if (ext === '.webp') return { ext: 'webp', contentType: 'image/webp' };
  return { ext: 'jpg', contentType: 'image/jpeg' };
}

function deriveTargetTextFromFileName(filePath) {
  const rawBase = path.basename(filePath, path.extname(filePath));
  const withoutSuffix = rawBase.replace(/(?:[_-](transparent|nobg|no-bg|removebg|final|v\d+))+$/gi, '');
  const spaced = withoutSuffix.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || rawBase;
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(path.resolve(process.cwd(), args.env));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  if (!serviceRole) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const bucket = args.bucket || process.env.SUPABASE_AI_TEXT_CACHE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'generated-maps';
  const inputDir = path.resolve(process.cwd(), args.inputDir);
  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }

  const extSet = new Set(parseExtensions(args.ext));
  if (extSet.size === 0) throw new Error('No extensions provided');
  const files = await listFiles(inputDir, args.recursive, extSet);
  if (files.length === 0) {
    console.log('No matching files found.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`[import_ai_text_design_cache] Files: ${files.length}`);
  console.log(`[import_ai_text_design_cache] Model: ${args.model}`);
  console.log(`[import_ai_text_design_cache] Color: ${args.colorKey}`);
  console.log(`[import_ai_text_design_cache] Bucket: ${bucket}`);
  console.log(`[import_ai_text_design_cache] Folder: ${args.folder}`);
  console.log(`[import_ai_text_design_cache] Table: ${args.table}`);
  console.log(`[import_ai_text_design_cache] Dry run: ${args.dryRun ? 'yes' : 'no'}`);

  const uploadedRows = [];
  const skippedTooLarge = [];
  const failedFiles = [];

  await mapLimit(files, args.uploadConcurrency, async (filePath, idx) => {
    try {
      const rel = path.relative(inputDir, filePath).replaceAll('\\', '/');
      const bytes = await fsp.readFile(filePath);
      if (bytes.length > args.maxImageBytes) {
        skippedTooLarge.push({ filePath: rel, bytes: bytes.length });
        return;
      }

      const rawTarget = deriveTargetTextFromFileName(filePath);
      const targetText = args.targetPrefix ? `${args.targetPrefix} ${rawTarget}`.trim() : rawTarget;
      const designName = args.designName || path.basename(filePath, path.extname(filePath));
      const cacheKey = buildCacheKey(args.model, targetText, args.colorKey);
      const imageHash = createHash('sha256').update(bytes).digest('hex');
      const keyHash = createHash('sha256').update(cacheKey).digest('hex').slice(0, 16);
      const colorSegment = normalizeColorKey(args.colorKey).replace(/[^a-z0-9_-]/g, '-').slice(0, 32) || 'color';
      const textSegment = toSlug(targetText, 'text');
      const designSegment = toSlug(designName, 'design');
      const imageMeta = inferContentType(filePath);
      const storagePath = `${args.folder}/${designSegment}/${colorSegment}/${textSegment}-${keyHash}/${imageHash}.${imageMeta.ext}`;

      if (!args.dryRun) {
        const upload = await supabase.storage.from(bucket).upload(storagePath, bytes, {
          contentType: imageMeta.contentType,
          upsert: true
        });
        if (upload.error) {
          throw new Error(upload.error.message);
        }
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const imageUrl = publicData.publicUrl;
      uploadedRows.push({
        model: args.model,
        target_text: targetText,
        color_key: args.colorKey,
        design_name: designName || null,
        normalized_text: normalizeTargetText(targetText),
        cache_key: cacheKey,
        image_url: imageUrl,
        image_hash: imageHash,
        storage_path: storagePath,
        use_count: 1,
        last_used_at: new Date().toISOString()
      });

      if ((idx + 1) % 250 === 0 || idx + 1 === files.length) {
        console.log(`Processed ${idx + 1}/${files.length}`);
      }
    } catch (err) {
      failedFiles.push({
        filePath: path.relative(inputDir, filePath).replaceAll('\\', '/'),
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  let dbChunks = 0;
  if (!args.dryRun && uploadedRows.length > 0) {
    const chunks = chunkArray(uploadedRows, args.dbBatchSize);
    for (const chunk of chunks) {
      const { error } = await supabase
        .from(args.table)
        .upsert(chunk, { onConflict: 'cache_key,image_hash', ignoreDuplicates: true });
      if (error) {
        throw new Error(`DB upsert failed: ${error.message}`);
      }
      dbChunks++;
    }
  }

  console.log('');
  console.log('Import summary');
  console.log(`- Scanned files: ${files.length}`);
  console.log(`- Prepared rows: ${uploadedRows.length}`);
  console.log(`- Skipped (too large): ${skippedTooLarge.length}`);
  console.log(`- Failed: ${failedFiles.length}`);
  console.log(`- DB batches: ${dbChunks}`);

  if (skippedTooLarge.length > 0) {
    console.log('');
    console.log('Skipped oversized files (first 20):');
    for (const item of skippedTooLarge.slice(0, 20)) {
      console.log(`- ${item.filePath} (${item.bytes} bytes)`);
    }
  }

  if (failedFiles.length > 0) {
    console.log('');
    console.log('Failed files (first 20):');
    for (const item of failedFiles.slice(0, 20)) {
      console.log(`- ${item.filePath}: ${item.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[import_ai_text_design_cache] failed:', err.message || err);
  process.exit(1);
});

