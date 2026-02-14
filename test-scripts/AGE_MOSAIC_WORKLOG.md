# Age Mosaic - Calisma Ozeti

Bu dokuman, `test-scripts/test_kolaj.py` uzerinde yapilan PoC calismalarinin ozetidir.

## Amac

- Rakam maskesi (ornek: `70`) icine fotograflari daha profesyonel bir sekilde yerlestirmek.
- "Blur fill" kullanmadan, kenar uyumu daha iyi bir mozaik elde etmek.
- Gercek urun orneklerindeki gibi daha dogal kolaj dagilimina yaklasmak.

## Yapilanlar

1. Eski script tamamen yenilendi:
   - Eski yaklasim: basit grid + sabit kare crop.
   - Yeni yaklasim: maske icinde `strict-grid` ve `adaptive-pack` layout modlari.

2. Seam azaltma teknikleri eklendi:
   - Integer koordinatlarla yerlestirme.
   - `bleed` (1-2 px overlap) destegi.
   - `supersample` (2x/4x render -> sonra downsample) destegi.

3. Fit modlari eklendi:
   - `cover` (bosluksuz, crop var)
   - `contain` (crop yok, bosluk olabilir)
   - `stretch` (deformasyon olabilir)

4. Smart crop eklendi (ozellikle insan kesilmesini azaltmak icin):
   - Once yuz algilama (OpenCV Haar Cascade)
   - Yuz yoksa saliency/gradient merkezleme
   - Sonra `cover` crop merkezini buna gore ayarlama
   - Parametre: `--smart-crop` / `--no-smart-crop`

5. Debug ve test yardimcilari:
   - `--debug-tiles` ile tile sinirlari cizdirme
   - `--save-mask` ile maskeyi kaydetme

## Uretilen Test Ciktilari (lokal)

Asagidaki PNG dosyalari `test-scripts/` altinda olusturuldu ve karsilastirma icin kullanildi:

- `out_70_poc_dense.png`
- `out_70_poc_match_try.png`
- `out_70_poc_strict.png`
- `out_70_poc_smart.png`
- `out_70_poc_no_smart.png`
- `out_70_poc_smart_bigtiles.png`
- `out_70_poc_no_smart_bigtiles.png`

Not: Bu PNG dosyalari `.gitignore` ile ignore ediliyor.

## Onerilen Baslangic Parametreleri

Gercek urune yakin bir baslangic icin:

```bash
python3 test-scripts/test_kolaj.py \
  --photos-dir age_test_images_2 \
  --age 70 \
  --size 1440x1152 \
  --output test-scripts/out_70_poc_smart.png \
  --layout adaptive-pack \
  --fit cover \
  --base-tile 32 \
  --gap 0 \
  --bleed 1 \
  --supersample 2 \
  --min-coverage 0.56 \
  --smart-crop
```

Daha "kalebodur" ve sık gorunum icin:

```bash
python3 test-scripts/test_kolaj.py \
  --photos-dir age_test_images_2 \
  --age 70 \
  --size 1440x1152 \
  --output test-scripts/out_70_poc_strict.png \
  --layout strict-grid \
  --fit cover \
  --base-tile 28 \
  --gap 0 \
  --bleed 1 \
  --supersample 2 \
  --min-coverage 0.58
```

## Acik Kalan Noktalar

- Smart crop etkisi veri setine gore degisiyor; bazi setlerde fark az gorunebilir.
- Gercek urundeki "manuel kolaj" hissi icin ileride daha gelismis rectangle packing stratejileri eklenebilir.
- Bu PoC henuz Next.js tarafina tasinmadi; once algoritma kalitesi burada olgunlastirilacak.
