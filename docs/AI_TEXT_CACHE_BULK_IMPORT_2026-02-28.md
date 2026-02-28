# AI Text Cache Bulk Import (2026-02-28)

Bu dokuman, app disinda uretilen PNG dosyalarini mevcut `ai_text_design_cache` yapisina toplu olarak yuklemek icin eklenen scriptin kullanimini anlatir.

## Eklenenler

- Script: `scripts/import_ai_text_design_cache.mjs`
- NPM komutu: `npm run import:ai-text-cache`
- Schema guncellemesi: `supabase/sql/ai_text_design_cache_schema.sql`
  - Yeni alan: `design_name text`
  - Yeni index: `idx_ai_text_design_cache_design_name`

## Migration

Import oncesi migration calistir:

```sql
-- File: supabase/sql/ai_text_design_cache_schema.sql
```

Bu migration `design_name` kolonunu ekler (yoksa) ve indexleri gunceller.

## Gerekli ENV

Asagidaki degiskenler gerekli:

- `SUPABASE_URL` (veya fallback olarak `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- Opsiyonel:
  - `SUPABASE_AI_TEXT_CACHE_TABLE` (default: `ai_text_design_cache`)
  - `SUPABASE_AI_TEXT_CACHE_BUCKET` (yoksa `SUPABASE_STORAGE_BUCKET`, o da yoksa `generated-maps`)
  - `SUPABASE_AI_TEXT_CACHE_FOLDER` (default: `ai-text-design-cache`)

## Import Mantigi

Her dosya icin script:

1. Dosyayi okur.
2. SHA-256 ile `image_hash` uretir.
3. Supabase Storage'a yukler (`upsert: true`).
4. DB'ye batch `upsert` yapar (`onConflict: cache_key,image_hash`).

Kullandigi metadata:

- `model`
- `target_text` (dosya adindan turetilir, `_` ve `-` bosluk olur)
- `color_key`
- `design_name`
- `normalized_text`
- `cache_key`
- `image_url`
- `image_hash`
- `storage_path`

## Dosya Adindan Target Text Turetime

Ornek:

- `RECEP_PEMBE_transparent.png` -> `RECEP PEMBE`
- `charlotte-v2-final.png` -> `charlotte v2`

Script son eklerden bazilarini temizler: `transparent`, `nobg`, `no-bg`, `removebg`, `final`, `vN`.

## Komutlar

### 1) Dry run (yazmaz, sadece kontrol)

```bash
npm run import:ai-text-cache -- \
  --input-dir /Users/aydin/Desktop/apps/ps-automation/output/simple_batch \
  --recursive \
  --model gemini-3.1-flash-image-preview \
  --color-key purple_gloss \
  --design-name "Bulk Varsity v1" \
  --dry-run
```

### 2) Gercek import

```bash
npm run import:ai-text-cache -- \
  --input-dir /Users/aydin/Desktop/apps/ps-automation/output/simple_batch \
  --recursive \
  --model gemini-3.1-flash-image-preview \
  --color-key purple_gloss \
  --design-name "Bulk Varsity v1" \
  --upload-concurrency 8 \
  --db-batch-size 500
```

## Parametreler

- `--input-dir`: Kaynak klasor (zorunlu)
- `--recursive`: Alt klasorleri de tara
- `--ext`: Uzanti listesi (default `.png`, ornek: `.png,.webp`)
- `--model`: DB metadata modeli
- `--color-key`: DB metadata renk anahtari
- `--design-name`: Tum satirlara sabit design adi
- `--target-prefix`: Turetilen target text'in basina prefix ekler
- `--upload-concurrency`: Paralel upload (default `8`)
- `--db-batch-size`: Tek seferde DB upsert adedi (default `500`)
- `--max-image-bytes`: Max dosya boyutu (default `15000000`)
- `--bucket`: Storage bucket override
- `--folder`: Storage klasoru override
- `--table`: DB tablo override

## Notlar

- App tarafi cache POST akisi da `designName` gonderecek sekilde guncellendi.
- Script duplicate durumunda (`cache_key + image_hash`) kaydi tekrar olusturmaz.
- 30k gibi yuksek sayida import icin once dry-run yap, sonra gercek importa gec.
