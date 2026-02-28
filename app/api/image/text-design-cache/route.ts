import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const DEFAULT_CACHE_TABLE = 'ai_text_design_cache';
const DEFAULT_LIMIT = 8;
const DEFAULT_CACHE_FOLDER = 'ai-text-design-cache';
const DEFAULT_MAX_IMAGE_BYTES = 15_000_000;

type CacheRow = {
  id: string;
  model: string;
  target_text: string;
  color_key?: string | null;
  design_name?: string | null;
  image_url: string;
  created_at: string;
};

type CacheRequestBody = {
  model?: string;
  targetText?: string;
  colorKey?: string;
  designName?: string;
  imageUrl?: string;
};

function normalizeTargetText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeColorKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildCacheKey(model: string, targetText: string, colorKey: string): string {
  return `${model.trim()}::${normalizeTargetText(targetText)}::${normalizeColorKey(colorKey)}`;
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, 20);
}

function isAllowedHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function toExtFromContentType(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'png';
}

function toSlug(value: string, fallback = 'text'): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || fallback;
}

function mapRow(row: CacheRow) {
  return {
    id: row.id,
    model: row.model,
    targetText: row.target_text,
    colorKey: row.color_key ?? 'purple_gloss',
    designName: row.design_name ?? null,
    imageUrl: row.image_url,
    createdAt: row.created_at
  };
}

function isMissingRelationError(message: string): boolean {
  return (
    /relation .* does not exist/i.test(message) ||
    /could not find the table .* in the schema cache/i.test(message) ||
    /does not exist in the schema cache/i.test(message)
  );
}

function isMissingColumnError(message: string): boolean {
  return /column .* does not exist/i.test(message);
}

async function fetchImageBytes(imageUrl: string): Promise<{ bytes: Buffer; contentType: string }> {
  const maxBytes = Number.parseInt(process.env.AI_TEXT_CACHE_MAX_BYTES ?? `${DEFAULT_MAX_IMAGE_BYTES}`, 10);
  const safeMaxBytes = Number.isFinite(maxBytes) && maxBytes > 100_000 ? maxBytes : DEFAULT_MAX_IMAGE_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(imageUrl, {
      method: 'GET',
      headers: { Accept: 'image/*,*/*;q=0.8' },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Could not download generated image (${res.status}).`);
  }

  const contentTypeHeader = (res.headers.get('content-type') ?? '').toLowerCase();
  const contentType = contentTypeHeader.split(';')[0]?.trim() || 'image/png';
  if (!contentType.startsWith('image/')) {
    throw new Error('Generated image URL did not return an image content type.');
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error('Generated image is empty.');
  }
  if (bytes.length > safeMaxBytes) {
    throw new Error('Generated image is too large for cache storage.');
  }
  return { bytes, contentType };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const model = (url.searchParams.get('model') ?? '').trim();
    const targetText = (url.searchParams.get('targetText') ?? '').trim();
    const colorKey = (url.searchParams.get('colorKey') ?? 'purple_gloss').trim() || 'purple_gloss';
    const limit = parseLimit(url.searchParams.get('limit'));

    if (!model || !targetText) {
      return NextResponse.json({ items: [] });
    }

    const cacheKey = buildCacheKey(model, targetText, colorKey);
    const table = (process.env.SUPABASE_AI_TEXT_CACHE_TABLE ?? DEFAULT_CACHE_TABLE).trim();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select('id,model,target_text,color_key,design_name,image_url,created_at')
      .eq('cache_key', cacheKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error.message)) {
        return NextResponse.json({ items: [] });
      }
      if (isMissingColumnError(error.message)) {
        return new NextResponse('Cache schema is outdated. Run the latest Supabase schema migration for AI text cache metadata.', { status: 503 });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({
      items: Array.isArray(data) ? (data as CacheRow[]).map(mapRow) : []
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to query AI text design cache.';
    return new NextResponse(message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CacheRequestBody;
    const model = (body.model ?? '').trim();
    const targetText = (body.targetText ?? '').trim();
    const colorKey = (body.colorKey ?? 'purple_gloss').trim() || 'purple_gloss';
    const designName = (body.designName ?? '').trim();
    const imageUrl = (body.imageUrl ?? '').trim();

    if (!model) return new NextResponse('model is required.', { status: 400 });
    if (!targetText) return new NextResponse('targetText is required.', { status: 400 });
    if (!imageUrl) return new NextResponse('imageUrl is required.', { status: 400 });
    if (!isAllowedHttpUrl(imageUrl)) return new NextResponse('imageUrl must be a valid http/https URL.', { status: 400 });

    const cacheKey = buildCacheKey(model, targetText, colorKey);
    const table = (process.env.SUPABASE_AI_TEXT_CACHE_TABLE ?? DEFAULT_CACHE_TABLE).trim();
    const storageBucket = (process.env.SUPABASE_AI_TEXT_CACHE_BUCKET ?? process.env.SUPABASE_STORAGE_BUCKET ?? 'generated-maps').trim();
    const storageFolder = (process.env.SUPABASE_AI_TEXT_CACHE_FOLDER ?? DEFAULT_CACHE_FOLDER).trim();
    const supabase = getSupabaseAdminClient();

    const probe = await supabase.from(table).select('id').limit(1);
    if (probe.error) {
      if (isMissingRelationError(probe.error.message)) {
        return new NextResponse('Cache table is not configured yet. Run the Supabase schema migration first.', { status: 503 });
      }
      if (isMissingColumnError(probe.error.message)) {
        return new NextResponse('Cache schema is outdated. Run the latest Supabase schema migration for AI text cache metadata.', { status: 503 });
      }
      throw new Error(probe.error.message);
    }

    const downloaded = await fetchImageBytes(imageUrl);
    const imageHash = createHash('sha256').update(downloaded.bytes).digest('hex');

    const existing = await supabase
      .from(table)
      .select('id,model,target_text,color_key,design_name,image_url,created_at')
      .eq('cache_key', cacheKey)
      .eq('image_hash', imageHash)
      .maybeSingle();

    if (existing.error) {
      if (isMissingRelationError(existing.error.message)) {
        return new NextResponse('Cache table is not configured yet. Run the Supabase schema migration first.', { status: 503 });
      }
      if (isMissingColumnError(existing.error.message)) {
        return new NextResponse('Cache schema is outdated. Run the latest Supabase schema migration for AI text cache metadata.', { status: 503 });
      }
      throw new Error(existing.error.message);
    }

    if (existing.data) {
      return NextResponse.json({
        cached: true,
        imageUrl: existing.data.image_url,
        item: mapRow(existing.data as CacheRow)
      });
    }

    const keyHash = createHash('sha256').update(cacheKey).digest('hex').slice(0, 16);
    const colorSegment = normalizeColorKey(colorKey).replace(/[^a-z0-9_-]/g, '-').slice(0, 32) || 'color';
    const textSegment = toSlug(targetText, 'text');
    const designSegment = toSlug(designName, 'design');
    const ext = toExtFromContentType(downloaded.contentType);
    const storagePath = `${storageFolder}/${designSegment}/${colorSegment}/${textSegment}-${keyHash}/${imageHash}.${ext}`;

    const upload = await supabase.storage.from(storageBucket).upload(storagePath, downloaded.bytes, {
      contentType: downloaded.contentType,
      upsert: true
    });
    if (upload.error) {
      throw new Error(`Storage upload failed: ${upload.error.message}`);
    }

    const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;

    const insert = await supabase
      .from(table)
      .insert({
        model,
        target_text: targetText,
        color_key: colorKey,
        design_name: designName || null,
        normalized_text: normalizeTargetText(targetText),
        cache_key: cacheKey,
        image_url: publicUrl,
        image_hash: imageHash,
        storage_path: storagePath,
        use_count: 1,
        last_used_at: new Date().toISOString()
      })
      .select('id,model,target_text,color_key,design_name,image_url,created_at')
      .single();

    if (insert.error) {
      if (isMissingRelationError(insert.error.message)) {
        return new NextResponse('Cache table is not configured yet. Run the Supabase schema migration first.', { status: 503 });
      }
      if (isMissingColumnError(insert.error.message)) {
        return new NextResponse('Cache schema is outdated. Run the latest Supabase schema migration for AI text cache metadata.', { status: 503 });
      }
      throw new Error(insert.error.message);
    }

    return NextResponse.json({
      cached: false,
      imageUrl: publicUrl,
      item: mapRow(insert.data as CacheRow)
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to persist AI text design cache.';
    return new NextResponse(message, { status: 500 });
  }
}
