# OurSkyMap Formula State - 2026-02-19

Bu dokuman, layout/formul degisimlerinin 3 durumunu kaydeder:

1. **Onceki Hali** (main'deki eski davranis)
2. **Sonraki Hali** (bu branch'teki ara global uygulama; gecici)
3. **Simdiki Hali** (aktif hedef durum: single eski, companion yeni)

## 1) Kisa Ozet

- **Single mode** su anda eski formullerle calisiyor.
- **Companion mode** su anda yeni formullerle calisiyor.
- Companion'da font hesabi en son revizyonda **uzun kenar** bazina cekildi.
- `SHOW_RULER=true` icin beyaz cap ruler'i + `DIA:` etiketi eklendi.

## 2) Terimler

- `W_long`: posterin uzun kenari (inch)
- `H_short`: posterin kisa kenari (inch)
- `ringInnerWidth`: ic ring stroke (px)
- `ringOuterWidth`: dis ring stroke (px)
- `visibleGap`: iki ring stroke arasindaki gorunen bosluk (px)
- `ringGap`: iki ring merkez yaricap farki (px)

`ringGap` donusumu:

```text
ringGap = visibleGap + ringInnerWidth/2 + ringOuterWidth/2
```

## 3) Durumlar (Onceki -> Sonraki -> Simdiki)

### A) Onceki Hali (main)

#### Single mode
- `chartDiameter`: boyut presetleri (temelde 16x20 referansli, `W/16*12.8` mantigi + bazi fixed degerler)
- Fontlar: `defaultPosterBySize` presetleri (H tabanli eski sistem)
- Top/Bottom: `getVerticalSpacing(size, H)`
  - `12x12 = 0.8"`
  - `20x20 = 1.3"`
  - digerleri `H/12.5`
- Left/Right: `pageMargin` veya `getDefaultMargin(size)`
- Title width: `max(0.80*W, 0.96*chartDiameter)`

#### Companion mode
- Chart/font genel olarak yine `defaultPosterBySize` degerlerinden geliyordu.
- Sadece companion override:
  - `ringInnerWidth = 8`
  - `ringOuterWidth = 4`
  - `visibleGap ~= 6` (ringGap=12 uzerinden)
  - `borderWidth = 4`
- Horizontal margin: sabit `72px` (1")

### B) Sonraki Hali (ara gecici uygulama)

Bu ara durumda yeni formuller tum modlara yayildi (single dahil), bu da single'da regresyon olusturdu:

- Chart fallback long-edge yeni formulden hesaplandi
- Margin/title width global degisti
- UI tarafinda formula override tum postere uygular hale geldi

Bu durum **kalici bir hedef degil**, ara gecis olarak kaldi.

### C) Simdiki Hali (aktif)

#### Single mode (geri alindi / korunuyor)
- Eski `defaultPosterBySize` + eski render mantigi korunur.
- Chart fallback yine eski `getPosterLayout` degerleri.
- Top/Bottom yine eski `getVerticalSpacing(size, H)`.
- Left/Right yine eski `pageMargin/getDefaultMargin`.
- Title width yine eski:
  - `max(0.80*W, 0.96*chartDiameter)`

#### Companion mode (yeni formul seti)

UI override (sadece companion):

```text
chartDiameter   = (W_long/20) * 8.8 inch
ringInnerWidth  = (W_long/20) * 6 px
ringOuterWidth  = (W_long/20) * 3 px
visibleGap      = (W_long/20) * 2 px
ringGap         = visibleGap + inner/2 + outer/2
borderWidth     = ringOuterWidth

titleFontSize   = (W_long/20) * 40
namesFontSize   = (W_long/20) * 55
metaFontSize    = (W_long/20) * 20
```

Render/layout tarafi (companion):

```text
left/right margin = (W_long/20) * 1.1 inch
top/bottom margin:
  - 12x12 ve 20x20: (H_short/20) * 3.3 inch
  - diger boyutlar: (H_short/16) * 1.6 inch

title text width = W_canvas * 0.75
```

## 4) Boyut Tablosu (Single vs Companion)

Asagidaki tablo chart/margin/font etkisini tum boyutlar icin ozetler.

| Size | W_long" | H_short" | Single (eski=simdiki) chart" | Companion Onceki chart" | Companion Simdiki chart" | Companion Onceki top" | Companion Simdiki top" | Companion Simdiki left" | Companion Simdiki fonts (T/N/M) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| us-letter | 11 | 8.50 | 6.80 | 6.80 | 4.84 | 0.68 | 0.85 | 0.61 | 22 / 30.25 / 11 |
| a4 | 11.69 | 8.26 | 6.60 | 6.60 | 5.15 | 0.66 | 0.83 | 0.64 | 23.39 / 32.16 / 11.69 |
| 11x14 | 14 | 11 | 8.80 | 8.80 | 6.16 | 0.88 | 1.10 | 0.77 | 28 / 38.50 / 14 |
| a3 | 16.54 | 11.69 | 9.33 | 9.33 | 7.28 | 0.94 | 1.17 | 0.91 | 33.08 / 45.49 / 16.54 |
| 12x12 | 12 | 12 | 8.60 | 8.60 | 5.28 | 0.80 | 1.98 | 0.66 | 24 / 33 / 12 |
| 12x16 | 16 | 12 | 9.60 | 9.60 | 7.04 | 0.96 | 1.20 | 0.88 | 32 / 44 / 16 |
| 16x20 | 20 | 16 | 12.80 | 12.80 | 8.80 | 1.28 | 1.60 | 1.10 | 40 / 55 / 20 |
| a2 | 23.39 | 16.54 | 13.23 | 13.23 | 10.29 | 1.32 | 1.65 | 1.29 | 46.78 / 64.32 / 23.39 |
| 18x24 | 24 | 18 | 14.40 | 14.40 | 10.56 | 1.44 | 1.80 | 1.32 | 48 / 66 / 24 |
| 20x20 | 20 | 20 | 14.30 | 14.30 | 8.80 | 1.30 | 3.30 | 1.10 | 40 / 55 / 20 |
| a1 | 42 | 23.63 | 18.70 | 18.70 | 18.48 | 1.89 | 2.36 | 2.31 | 84 / 115.50 / 42 |
| 24x32 | 32 | 24 | 19.20 | 19.20 | 14.08 | 1.92 | 2.40 | 1.76 | 64 / 88 / 32 |

## 5) Ruler Notu

`SHOW_RULER=true` durumunda:

- Merkez eksen ruler'i (cyan/sari/kirmizi) devam ediyor.
- Beyaz cap ruler'i eklendi:
  - cap cizgisi (sol kenar -> sag kenar)
  - 1/4" fiziksel tick'ler
  - uc etiketi: `DIA: X.XXX"`

## 6) Kod Referanslari

- UI formuller / companion override:
  - `app/ourskymap/page.tsx` (`buildPosterFormulaOverrides`, `generate`, `handleCheckout`)
- Render/layout formulleri:
  - `lib/poster.ts` (`getPosterLayout`, `getVerticalSpacing`, `getCompanionVerticalSpacing`, `renderPosterSvg`)
- API endpoint:
  - `app/api/skymap/route.ts` (`renderPosterSvg` cagri noktasi)

