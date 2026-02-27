# Image/Text Toolbar Curve Ozelligi (Teknik Not)

Date: 2026-02-27
Scope: `main` branch, `app/image/page.tsx`

## 1) Ozellik Ozeti

Text bar'daki yukari/asagi curve butonlari secili text layer'in `curve` degerini degistirir.
- Eksi deger: asagi bombeli (down curve)
- Arti deger: yukari bombeli (up curve)
- `0`: duz yazi

Kod referansi:
- `TextLayer.curve`: `app/image/page.tsx:94-105`
- Toolbar actions: `app/image/page.tsx:1854-1898`

## 2) State ve Toolbar Baglantisi

Her text layer'da `curve: number` tutulur.
- `Curve down` butonu: `curve - 8`
- `Curve up` butonu: `curve + 8`
- Aralik: `[-100, 100]` (clamp)
- Reset: `curve = 0`

Kod referansi:
- `updateActiveTextLayer({ curve: clamp(activeTextLayer.curve - 8, -100, 100) })`
- `updateActiveTextLayer({ curve: clamp(activeTextLayer.curve + 8, -100, 100) })`
- `updateActiveTextLayer({ curve: 0 })`
- `app/image/page.tsx:1861-1890`

## 3) Curve Hesaplama Algoritmasi

Ana fonksiyon: `buildCurvedTextLayout(input)`
- Referans: `app/image/page.tsx:384-448`

### 3.1 Girdi
- `text`
- `fontSizePx`
- `curveAmount` (`-100..100`)
- `fontFamily`, `fontWeight`, `fontStyle`
- `letterSpacingPx`

### 3.2 Normalizasyon
- Satir kiriklari tek satira cevriliyor (`\n` -> bosluk)
- Karakterler `Array.from(...)` ile tek tek isleniyor.

### 3.3 Egrilik siddeti
- `safeCurve = clamp(curveAmount, -100, 100)`
- `curvePx = (safeCurve / 100) * fontSizePx * 1.4`

Bu deger hem dikey ofseti hem de harf acisini belirler.

### 3.4 Harf genislik olcumu
- Browser canvas measure ile her karakterin width'i olculuyor.
- `measureText` yoksa fallback katsayilari var.
- Letter spacing ekleniyor.

Kod referansi:
- `advances` hesaplari: `app/image/page.tsx:409-416`

### 3.5 Parabol modeli
Her harf icin merkez konum bulunuyor ve parabol uzerine yerlestiriliyor:
- `curveFactor = 1 - (xFromCenter^2 / denom)`
- `yOffset = -curvePx * curveFactor`
- `derivative = (2 * curvePx * xFromCenter) / denom`
- `angleDeg = atan(derivative)`

Bu sayede:
- Merkez harfler daha fazla yukari/asagi kayar
- Kenarlarda kayma azalir
- Harfler teget yone dogru dondurulur

Kod referansi:
- `app/image/page.tsx:433-444`

## 4) Render Akisi

Render asamasinda su kontrol yapilir:
- `safeCurve = clamp(layer.curve ?? 0, -100, 100)`
- `abs(safeCurve) > 0` ise curved render
- Degilse normal text render

Kod referansi:
- Birinci render blogu: `app/image/page.tsx:2066-2141`
- Ikinci render blogu (t-shirt preview yolu): `app/image/page.tsx:2227-2301`

### Curved render nasil yapiliyor?
- Container: `.textLayer`
- Ic katman: `.textCurveLayer`
- Her karakter icin ayri `<span class="textCurveGlyph">`
- Her glyph'e `left/top` ve `rotate(angleDeg)` uygulanir

Kod referansi:
- `app/image/page.tsx:2119-2137`
- `app/image/page.tsx:2280-2298`

## 5) CSS Tarafi

Curved yapida iki kritik sinif var:
- `.textCurveLayer { position: relative; pointer-events: none; }`
- `.textCurveGlyph { position: absolute; transform-origin: center; }`

Kod referansi:
- `app/image/page.tsx:3768-3780`

## 6) Neden Bu Yontem Secildi?

Bu implementasyon SVG path yerine per-glyph DOM yontemi kullaniyor.
Avantajlari:
- Mevcut text drag/rotate sistemiyle kolay entegre
- Font preset, shadow, transform akisini bozmadan calisir
- Curve ac/kapat mantigi basit (`curve === 0`)

Tradeoff:
- Cok uzun metin + cok buyuk fontta daha fazla DOM span olusur.

## 7) Ayar Degistirmek Istersek

Hizli tuning noktalari:
- Buton step miktari: `8` (`app/image/page.tsx:1861, 1876`)
- Maks curve araligi: `-100..100`
- Egrilik siddet katsayisi: `fontSizePx * 1.4` (`app/image/page.tsx:398`)

Bu 3 nokta degistirilerek daha yumuşak veya daha agresif curve davranisi elde edilir.

