'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PosterParams, RenderParams } from '../../lib/types';

type SizePreset = {
  key: DesignSize;
  title: string;
  sub: string;
  compact?: boolean;
};

type DesignSize = 'a2' | 'us-letter' | '16x20' | '18x24' | 'moon-phase';

type FontPresetKey = 'calligraphy' | 'serif' | 'gothic' | 'times';

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

const SIZE_PRESETS: SizePreset[] = [
  { key: 'a2', title: 'A2', sub: '420 x 594 mm' },
  { key: 'us-letter', title: 'US Letter', sub: '8.5 x 11 in', compact: true },
  { key: '16x20', title: '16 x 20', sub: '16 x 20 in', compact: true },
  { key: '18x24', title: '18 x 24', sub: '18 x 24 in', compact: true },
  { key: 'moon-phase', title: 'Moon Phase', sub: '24 x 18 in', compact: true }
];

const FONT_PRESETS: { key: FontPresetKey; label: string }[] = [
  { key: 'calligraphy', label: 'Calligraphy' },
  { key: 'serif', label: 'Serif' },
  { key: 'gothic', label: 'Gothic' },
  { key: 'times', label: 'Times New Roman' }
];

const POSTER_PALETTES: { key: PosterParams['palette']; label: string; bg: string; ink: string; tone: 'dark' | 'light' }[] = [
  { key: 'classic-black', label: 'Classic', bg: '#0b0b0d', ink: '#f6f6f7', tone: 'dark' },
  { key: 'midnight', label: 'Midnight', bg: '#0b1020', ink: '#ffffff', tone: 'dark' },
  { key: 'navy-gold', label: 'Navy/Gold', bg: '#151c2d', ink: '#f4c25b', tone: 'dark' },
  { key: 'night-gold', label: 'Night/Gold', bg: '#24283a', ink: '#fbab29', tone: 'dark' },
  { key: 'twilight-blue', label: 'Twilight', bg: '#1f2a44', ink: '#d7e3ff', tone: 'dark' },
  { key: 'storm-gray', label: 'Storm Gray', bg: '#2a2f39', ink: '#e8e9ee', tone: 'dark' },
  { key: 'mocha', label: 'Mocha', bg: '#3b2d2a', ink: '#f2d8c8', tone: 'dark' },
  { key: 'soft-sage', label: 'Soft Sage', bg: '#25352f', ink: '#d8e7de', tone: 'dark' },
  { key: 'blush-night', label: 'Blush Night', bg: '#3a2733', ink: '#f5d7e2', tone: 'dark' },
  { key: 'slate', label: 'Slate', bg: '#111827', ink: '#d9d9d9', tone: 'dark' },
  { key: 'forest', label: 'Forest', bg: '#0e1f16', ink: '#d9d9d9', tone: 'dark' },
  { key: 'emerald', label: 'Emerald', bg: '#0b3d2e', ink: '#d9d9d9', tone: 'dark' },
  { key: 'plum', label: 'Plum', bg: '#1c1230', ink: '#d9d9d9', tone: 'dark' },
  { key: 'burgundy', label: 'Burgundy', bg: '#2a0f1a', ink: '#d9d9d9', tone: 'dark' },
  { key: 'cream-ink', label: 'Cream', bg: '#fbf5ea', ink: '#1b1b1b', tone: 'light' },
  { key: 'sand', label: 'Sand', bg: '#f7f3e8', ink: '#1b1b1b', tone: 'light' },
  { key: 'pearl', label: 'Pearl', bg: '#f2f0ea', ink: '#202020', tone: 'light' }
];

function findPalette(paletteKey: PosterParams['palette']) {
  return POSTER_PALETTES.find((p) => p.key === paletteKey) ?? POSTER_PALETTES[1];
}

const defaultParams: RenderParams = {
  theme: 'dark',
  showAzimuthScale: true,
  showCoordinateGrid: false,
  coordinateGridStepDeg: 30,
  labelConstellations: true,
  labelSolarSystem: false,
  mirrorHorizontal: true,
  showSolarSystem: false,
  showDeepSky: false,
  labelDeepSky: false,
  starMode: 'all',
  magnitudeLimit: 6.0,
  minStarSize: 1.1,
  starSizeMin: 0.75,
  starSizeMax: 6.0,
  starSizeGamma: 1.8,
  starAlpha: 1.0,
  emphasizeVertices: true,
  vertexSizeMin: 3.0,
  vertexSizeMax: 22.0,
  vertexSizeGamma: 1.2,
  vertexAlpha: 0.95,
  constellationLineWidth: 0.6,
  constellationLineAlpha: 0.7,
  eclipticAlpha: 0.35,
  azimuthRingInnerWidth: 1.2,
  azimuthRingOuterWidth: 0.8
};

const defaultPosterBySize: Record<DesignSize, Partial<PosterParams>> = {
  a2: {
    chartDiameter: 11.97 * 72,
    ringInnerWidth: 5.2,
    ringGap: 11,
    ringOuterWidth: 11.4,
    titleFontSize: 52,
    namesFontSize: 72,
    metaFontSize: 26,
    metaLetterSpacing: 6.6,
    metaLineSpacing: 1.52,
    metaUppercase: false
  },
  'us-letter': {
    chartDiameter: 408.5,
    ringInnerWidth: 3.1,
    ringGap: 8,
    ringOuterWidth: 7.2,
    titleFontSize: 30,
    namesFontSize: 38,
    metaFontSize: 14,
    metaLetterSpacing: 2.3,
    metaLineSpacing: 1.38,
    metaUppercase: false
  },
  '16x20': {
    chartDiameter: 12.16 * 72,
    ringInnerWidth: 4.5,
    ringGap: 10,
    ringOuterWidth: 11,
    titleFontSize: 45,
    namesFontSize: 64,
    metaFontSize: 23,
    metaLetterSpacing: 5.8,
    metaLineSpacing: 1.5,
    metaUppercase: false
  },
  '18x24': {
    chartDiameter: 12.54 * 72,
    ringInnerWidth: 5.2,
    ringGap: 11,
    ringOuterWidth: 12,
    titleFontSize: 46,
    namesFontSize: 68,
    metaFontSize: 24,
    metaLetterSpacing: 6,
    metaLineSpacing: 1.5,
    metaUppercase: false
  },
  'moon-phase': {
    chartDiameter: 10 * 72,
    ringInnerWidth: 4.6,
    ringGap: 9.5,
    ringOuterWidth: 10.6,
    titleFontSize: 46,
    namesFontSize: 62,
    metaFontSize: 21,
    metaLetterSpacing: 5.3,
    metaLineSpacing: 1.42,
    metaUppercase: false
  }
};

const defaultPoster: PosterParams = {
  size: '16x20',
  palette: 'midnight',
  inkColor: '#ffffff',
  border: true,
  borderWidth: 2,
  borderInset: 14,
  chartDiameter: 12.16 * 72,
  title: 'We met under this sky',
  subtitle: 'Sarah & John',
  dedication: '',
  showCoordinates: false,
  coordsInline: false,
  showTime: false,
  includeAzimuthScale: true,
  showCardinals: false,
  ringInnerWidth: 4.5,
  ringGap: 10,
  ringOuterWidth: 11,
  titleFont: 'prata',
  titleFontSize: 45,
  namesFont: 'jimmy-script',
  namesFontSize: 64,
  metaFont: 'signika',
  metaFontSize: 23,
  metaText: 'February 13, 2026, Florida, USA',
  metaFontWeight: 500,
  metaLetterSpacing: 5.8,
  metaLineSpacing: 1.5,
  metaUppercase: false
};

function mapFontPresetToPoster(fontPreset: FontPresetKey): Pick<PosterParams, 'titleFont' | 'namesFont' | 'metaFont'> {
  if (fontPreset === 'calligraphy') {
    return { titleFont: 'prata', namesFont: 'jimmy-script', metaFont: 'signika' };
  }
  if (fontPreset === 'serif') {
    return { titleFont: 'serif', namesFont: 'serif', metaFont: 'serif' };
  }
  if (fontPreset === 'gothic') {
    return { titleFont: 'sans', namesFont: 'sans', metaFont: 'sans' };
  }
  return { titleFont: 'serif', namesFont: 'serif', metaFont: 'serif' };
}

function mapDesignSizeToPosterSize(size: DesignSize): PosterParams['size'] {
  return size === 'moon-phase' ? '18x24' : size;
}

function formatDateLine(dateIso: string, place: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const datePart = Number.isNaN(d.getTime())
    ? dateIso
    : new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(d);
  const cleanPlace = place.trim();
  return cleanPlace ? `${datePart}, ${cleanPlace}` : datePart;
}

function normalizePlaceLabel(label: string): string {
  const chunk = label
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (chunk.length === 0) return '';
  if (chunk.length === 1) return chunk[0];
  return `${chunk[0]}, ${chunk[chunk.length - 1]}`;
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="toggleRow"
      aria-pressed={checked}
    >
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span className="knob" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function DesignPage() {
  const [size, setSize] = useState<DesignSize>('16x20');
  const [frameOn, setFrameOn] = useState(true);
  const [palette, setPalette] = useState<PosterParams['palette']>('midnight');
  const [cityQuery, setCityQuery] = useState('Florida, USA');
  const [locationLabel, setLocationLabel] = useState('Florida, USA');
  const [lat, setLat] = useState(27.6648);
  const [lon, setLon] = useState(-81.5158);
  const [date, setDate] = useState('2026-02-13');
  const [time, setTime] = useState('00:00');
  const [showConstellations, setShowConstellations] = useState(true);
  const [showGraticule, setShowGraticule] = useState(false);
  const [title, setTitle] = useState('We met under this sky');
  const [fontPreset, setFontPreset] = useState<FontPresetKey>('calligraphy');
  const [names, setNames] = useState('Sarah & John');
  const [locationLine, setLocationLine] = useState('February 13, 2026, Florida, USA');
  const [locationLineDirty, setLocationLineDirty] = useState(false);
  const [geoExpanded, setGeoExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [posterSvg, setPosterSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latestRequestRef = useRef(0);

  const selectedPalette = useMemo(() => findPalette(palette), [palette]);
  const effectiveTheme = selectedPalette.tone;

  useEffect(() => {
    if (locationLineDirty) return;
    const pretty = normalizePlaceLabel(locationLabel || cityQuery);
    setLocationLine(formatDateLine(date, pretty));
  }, [cityQuery, date, locationLabel, locationLineDirty]);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as GeocodeResult[];
        setSuggestions(data.slice(0, 3));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  const previewBg = useMemo(() => {
    return effectiveTheme === 'dark'
      ? 'radial-gradient(1200px 700px at 50% 30%, #eceff3 0%, #d8dde5 55%, #ced4de 100%)'
      : 'radial-gradient(1200px 700px at 50% 30%, #ffffff 0%, #f4f5f6 55%, #eceeef 100%)';
  }, [effectiveTheme]);

  const applySuggestion = useCallback((item: GeocodeResult) => {
    setCityQuery(item.label);
    setLocationLabel(item.label);
    setLat(item.lat);
    setLon(item.lon);
    setSuggestionsOpen(false);
  }, []);

  const generate = useCallback(async () => {
    setBusy(true);
    setError('');
    const reqId = ++latestRequestRef.current;
    try {
      const localDateTime = `${date}T${time}`;
      const normalizeRes = await fetch('/api/normalize-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          localDateTime
        })
      });
      if (!normalizeRes.ok) {
        throw new Error((await normalizeRes.text()) || 'Time normalization failed');
      }
      const normalized = (await normalizeRes.json()) as {
        timeUtcIso: string;
        timeZone: string;
      };

      const params: RenderParams = {
        ...defaultParams,
        theme: effectiveTheme,
        showCoordinateGrid: showGraticule,
        labelConstellations: showConstellations,
        constellationLineAlpha: showConstellations ? 0.7 : 0,
        mirrorHorizontal: true
      };

      const mappedFont = mapFontPresetToPoster(fontPreset);
      const bySize = defaultPosterBySize[size];
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const fallbackLocationLine = formatDateLine(date, cleanPlace);
      const nextMetaLine = locationLine.trim() || fallbackLocationLine;

      const poster: PosterParams = {
        ...defaultPoster,
        ...bySize,
        ...mappedFont,
        size: mapDesignSizeToPosterSize(size),
        border: frameOn,
        title,
        subtitle: names,
        metaText: nextMetaLine,
        palette,
        inkColor: selectedPalette.ink,
        includeAzimuthScale: true,
        showCardinals: false,
        showCoordinates: false,
        showTime: false,
        dedication: '',
        showMoonPhase: size === 'moon-phase',
        moonPhaseImageUrl: '/moon.png'
      };

      const posterRes = await fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          timeUtcIso: normalized.timeUtcIso,
          timeZone: normalized.timeZone,
          timeLocal: localDateTime,
          locationLabel: cleanPlace || 'Custom location',
          params,
          poster
        })
      });
      if (!posterRes.ok) {
        throw new Error((await posterRes.text()) || 'Poster generation failed');
      }
      const svg = await posterRes.text();
      if (reqId !== latestRequestRef.current) return;
      setPosterSvg(svg);
    } catch (e: any) {
      if (reqId !== latestRequestRef.current) return;
      setError(e?.message ?? String(e));
    } finally {
      if (reqId === latestRequestRef.current) setBusy(false);
    }
  }, [
    cityQuery,
    date,
    fontPreset,
    frameOn,
    lat,
    locationLabel,
    locationLine,
    lon,
    names,
    palette,
    showConstellations,
    showGraticule,
    size,
    effectiveTheme,
    time,
    title
  ]);

  useEffect(() => {
    void generate();
  }, [generate]);

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">*</div>
          <div className="brandText">
            <div className="brandMain">STAR MAP</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <nav className="menu">
          <a href="/citymap">City Map</a>
          <a href="/what-is-star-map">What is Star Map?</a>
          <a href="/faq">FAQ</a>
          <a href="#">Contact</a>
          <a href="/blog">Blog</a>
        </nav>
        <button className="shopBtn" type="button">
          Shop Now
        </button>
      </header>

      <main className="layout">
        <aside className="leftPanel">
          <section className="panelCard">
            <h3>Select size</h3>
            <div className="sizeGrid">
              {SIZE_PRESETS.map((item) => (
                <div key={item.key} className={`sizeOption ${item.key === 'moon-phase' ? 'wide' : ''}`}>
                  <button
                    type="button"
                    className={`sizeBtn ${size === item.key ? 'active' : ''} ${item.compact ? 'compact' : ''}`}
                    onClick={() => setSize(item.key)}
                  >
                    <span>{item.title}</span>
                  </button>
                  <small className="sizeMeta">{item.sub}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panelCard">
            <h3>Frame Options</h3>
            <div className="frameGrid">
              <button
                type="button"
                className={`frameBtn ${frameOn ? 'active' : ''}`}
                onClick={() => setFrameOn(true)}
              >
                <span className="frameIcon">[]</span>
                <small>Default Frame</small>
              </button>
              <button
                type="button"
                className={`frameBtn ${!frameOn ? 'active' : ''}`}
                onClick={() => setFrameOn(false)}
              >
                <span className="frameIcon">X</span>
                <small>No Frame</small>
              </button>
            </div>
          </section>
        </aside>

        <section className="previewPanel" style={{ background: previewBg }}>
          <div className="paper">
            {posterSvg ? <div className="svgMount" dangerouslySetInnerHTML={{ __html: posterSvg }} /> : null}
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelBlock softA">
            <div className="fieldGroup">
              <label>Palette:</label>
              <div className="palettePicker">
                {POSTER_PALETTES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`paletteBtn ${palette === p.key ? 'active' : ''}`}
                    title={p.label}
                    onClick={() => {
                      setPalette(p.key);
                    }}
                  >
                    <span className="swatch" style={{ background: p.bg }} />
                    <span className="swatchInk" style={{ background: p.ink }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="fieldGroup">
              <label>City:</label>
              <div className="cityWrap">
                <input
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Search location..."
                />
                <button
                  type="button"
                  className="arrowBtn"
                  onClick={() => {
                    setGeoExpanded((v) => !v);
                    setSuggestionsOpen(false);
                  }}
                  aria-label={geoExpanded ? 'Latitude/Longitude alanını gizle' : 'Latitude/Longitude alanını göster'}
                >
                  {geoExpanded ? '^' : 'v'}
                </button>
                {suggestionsOpen && suggestions.length > 0 ? (
                  <div className="suggestions">
                    {suggestions.map((item) => (
                      <button key={`${item.lat}_${item.lon}`} type="button" onClick={() => applySuggestion(item)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {geoExpanded ? (
              <>
                <div className="fieldGroup">
                  <label>Latitude:</label>
                  <input
                    type="number"
                    value={lat}
                    step={0.0001}
                    onChange={(e) => setLat(Number(e.target.value))}
                  />
                </div>
                <div className="fieldGroup">
                  <label>Longitude:</label>
                  <input
                    type="number"
                    value={lon}
                    step={0.0001}
                    onChange={(e) => setLon(Number(e.target.value))}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="panelBlock softB">
            <div className="fieldGroup">
              <label>Date:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="fieldGroup">
              <label>Time:</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <p className="hint">Default time is midnight (00:00). You can specify your preferred time.</p>

            <Toggle checked={showConstellations} onChange={setShowConstellations} label="Show Constellations" />
            <Toggle checked={showGraticule} onChange={setShowGraticule} label="Show Graticule" />
          </div>

          <div className="panelBlock softC">
            <div className="fieldGroup">
              <label>Title:</label>
              <textarea value={title} rows={3} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="fieldGroup">
              <label>Font:</label>
              <select value={fontPreset} onChange={(e) => setFontPreset(e.target.value as FontPresetKey)}>
                {FONT_PRESETS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fieldGroup">
              <label>Names:</label>
              <input value={names} onChange={(e) => setNames(e.target.value)} />
            </div>

            <div className="fieldGroup">
              <label>Location:</label>
              <input
                value={locationLine}
                onChange={(e) => {
                  setLocationLine(e.target.value);
                  setLocationLineDirty(true);
                }}
              />
            </div>

            <button type="button" className="checkoutBtn" onClick={() => void generate()} disabled={busy}>
              {busy ? 'Updating...' : 'Checkout'}
            </button>
            {error ? <p className="error">{error}</p> : null}
          </div>
        </aside>
      </main>

      <style jsx>{`
        .designRoot :global(*),
        .designRoot :global(*::before),
        .designRoot :global(*::after) {
          box-sizing: border-box;
        }

        .designRoot {
          min-height: 100vh;
          background: #dfe3ea;
          color: #121317;
        }

        .topbar {
          height: 84px;
          background: #020726;
          color: #fff;
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 20px;
          padding: 0 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          line-height: 1;
        }

        .brandMain {
          font-size: 20px;
          letter-spacing: 0.1em;
          line-height: 1;
          font-weight: 700;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .brandSub {
          font-size: 9px;
          letter-spacing: 0.34em;
          margin-top: 2px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .menu {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .menu a {
          color: rgba(255, 255, 255, 0.84);
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.01em;
        }

        .shopBtn {
          height: 44px;
          padding: 0 24px;
          border-radius: 999px;
          border: 0;
          background: #435993;
          color: #fff;
          font-size: 17px;
          cursor: pointer;
        }

        .layout {
          min-height: calc(100vh - 84px);
          display: grid;
          grid-template-columns: 260px minmax(560px, 1fr) 410px;
        }

        .leftPanel {
          padding: 28px 20px;
          background: linear-gradient(180deg, #e7ebf1 0%, #dee3ea 100%);
          border-right: 1px solid #cfd6e2;
          display: grid;
          align-content: start;
          gap: 20px;
        }

        .panelCard {
          background: #f8fafd;
          border: 1px solid #d4dbe6;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
        }

        .panelCard h3 {
          margin: 0 0 14px;
          font-size: 24px;
          font-weight: 600;
        }

        .sizeGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .sizeOption {
          display: grid;
          gap: 6px;
          align-items: start;
        }

        .sizeOption.wide {
          grid-column: 1 / -1;
        }

        .sizeOption.wide .sizeBtn {
          min-height: 68px;
        }

        .sizeOption.wide .sizeBtn span {
          font-size: 22px;
          letter-spacing: 0.01em;
        }

        .sizeBtn {
          border-radius: 16px;
          border: 1px solid #d4dae4;
          background: #ffffff;
          min-height: 78px;
          cursor: pointer;
          display: grid;
          align-content: center;
          justify-items: center;
          padding: 0 8px;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }

        .sizeBtn span {
          font-size: 22px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sizeBtn.compact span {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .sizeMeta {
          color: #6e7481;
          font-size: 12px;
          line-height: 1.2;
          text-align: center;
        }

        .sizeBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff, 0 6px 14px rgba(47, 116, 255, 0.16);
          background: #edf3ff;
        }

        .sizeBtn:hover {
          border-color: #b9c7dd;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.08);
        }

        .frameGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .frameBtn {
          border: 1px solid #d4dae4;
          border-radius: 14px;
          background: #ffffff;
          min-height: 88px;
          cursor: pointer;
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 10px;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }

        .frameBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff, 0 6px 14px rgba(47, 116, 255, 0.16);
          background: #edf3ff;
        }

        .frameBtn:hover {
          border-color: #b9c7dd;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.08);
        }

        .frameIcon {
          width: 40px;
          height: 40px;
          font-size: 28px;
          display: grid;
          place-items: center;
        }

        .frameBtn small {
          font-size: 13px;
          color: #5f6470;
        }

        .previewPanel {
          display: grid;
          place-items: center;
          padding: 28px;
          min-width: 0;
        }

        .paper {
          width: min(100%, 960px);
          height: min(82vh, calc(100vh - 150px));
          min-height: 520px;
          display: grid;
          place-items: center;
          border-radius: 24px;
          border: 1px solid rgba(209, 216, 226, 0.9);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 80px rgba(10, 17, 32, 0.14);
          padding: 28px;
          overflow: hidden;
        }

        .svgMount {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: grid;
          place-items: center;
        }

        .svgMount :global(svg) {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          display: block;
          filter: drop-shadow(0 18px 36px rgba(15, 20, 28, 0.24));
        }

        .rightPanel {
          padding: 28px;
          background: linear-gradient(180deg, #e7ebf1 0%, #dee3ea 100%);
          border-left: 1px solid #cfd6e2;
          display: grid;
          align-content: start;
          gap: 16px;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
        }

        .panelBlock {
          background: #f7f9fc;
          border: 1px solid #d3dce8;
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 14px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
          min-width: 0;
        }

        .panelBlock.softA {
          background: #f5f7fb;
          border-color: #d0d8e6;
        }

        .panelBlock.softB {
          background: #f8f6fb;
          border-color: #d9d2e8;
        }

        .panelBlock.softC {
          background: #f6faf7;
          border-color: #d2e1d7;
        }

        .row {
          display: grid;
          grid-template-columns: 86px 1fr;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #1c1f27;
        }

        .fieldGroup {
          display: grid;
          grid-template-columns: 86px 1fr;
          align-items: start;
          gap: 10px;
          min-width: 0;
        }

        .fieldGroup > :last-child {
          min-width: 0;
        }

        .palettePicker {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
          gap: 8px;
        }

        .paletteBtn {
          height: 34px;
          border-radius: 8px;
          border: 1px solid #cbd3df;
          background: #fff;
          padding: 4px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .paletteBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff;
        }

        .paletteBtn .swatch {
          position: absolute;
          inset: 4px;
          border-radius: 5px;
        }

        .paletteBtn .swatchInk {
          position: absolute;
          width: 35%;
          height: 30%;
          right: 6px;
          bottom: 6px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        input,
        textarea,
        select {
          width: 100%;
          max-width: 100%;
          border: 1px solid #cdd2da;
          border-radius: 12px;
          min-height: 44px;
          background: #fff;
          font-size: 13px;
          color: #1a1d23;
          padding: 0 16px;
          outline: none;
        }

        textarea {
          min-height: 96px;
          padding: 14px 16px;
          resize: vertical;
        }

        .cityWrap {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 58px;
          gap: 8px;
          min-width: 0;
        }

        .arrowBtn {
          border: 1px solid #cdd2da;
          border-radius: 12px;
          background: #fff;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
        }

        .suggestions {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          z-index: 4;
          background: #fff;
          border: 1px solid #cdd2da;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
        }

        .suggestions button {
          width: 100%;
          text-align: left;
          border: 0;
          border-top: 1px solid #eff2f6;
          background: #fff;
          padding: 12px 14px;
          font-size: 13px;
          cursor: pointer;
        }

        .suggestions button:first-child {
          border-top: 0;
        }

        .suggestions button:hover {
          background: #f8fafc;
        }

        .hint {
          margin: 0;
          font-size: 12px;
          color: #6f7481;
          padding-left: 96px;
          line-height: 1.35;
        }

        .designRoot :global(.toggleRow) {
          width: 100%;
          border: 1px solid #ccd3de;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: #17191f;
          text-align: left;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .designRoot :global(.toggleRow[aria-pressed='true']) {
          border-color: #1f2937;
          background: #f7f9fc;
          box-shadow: inset 0 0 0 1px rgba(31, 41, 55, 0.2);
        }

        .designRoot :global(.switch) {
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: #d7d7d7;
          position: relative;
          transition: background 0.2s ease;
          flex: 0 0 auto;
        }

        .designRoot :global(.switch.on) {
          background: #131316;
        }

        .designRoot :global(.knob) {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        }

        .designRoot :global(.switch.on .knob) {
          transform: translateX(20px);
        }

        .checkoutBtn {
          border: 0;
          border-radius: 12px;
          min-height: 50px;
          font-size: 18px;
          background: #101215;
          color: #fff;
          cursor: pointer;
          margin-top: 6px;
        }

        .checkoutBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .error {
          margin: 0;
          color: #b91c1c;
          font-size: 13px;
        }

        @media (max-width: 1280px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .leftPanel {
            border-right: 0;
            border-bottom: 1px solid #d2d5dc;
          }

          .rightPanel {
            border-left: 0;
            border-top: 1px solid #d2d5dc;
          }

          .previewPanel {
            min-height: 50vh;
            padding: 18px;
          }

          .paper {
            min-height: 440px;
            height: min(74vh, calc(100vh - 120px));
            padding: 18px;
          }

          .topbar {
            height: auto;
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 12px 14px;
          }

          .menu {
            flex-wrap: wrap;
            gap: 10px 16px;
          }
        }
      `}</style>
    </div>
  );
}
