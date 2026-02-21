# OurSkyMap Fixed Size Table - 2026-02-21

Bu dokuman, kullanicidan gelen sabit tabloya dayali yeni kaynak dosyasini referans eder.

Tek kaynak:
- `lib/ourskymap-fixed-sizes.ts`

Bolumler:
- `ONLY_CHART_FIXED_INCH_MM`: Dikey / Only Chart sabitleri
- `STAR_CHART_MOON_FIXED_INCH_MM`: Yatay / Star Chart + Moon sabitleri

Notlar:
- Cizgi kalinliklari ve ic-dis cizgi boslugu tabloda mm olarak tutulur.
- Render tarafinda px cevirimi kullanilir (`72 / 25.4`).
- `ringGap` render formati icin su sekilde turetilir:
  - `ringGap = visibleGapPx + ringInnerWidthPx/2 + ringOuterWidthPx/2`
