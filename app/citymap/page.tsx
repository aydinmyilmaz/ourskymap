'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PosterParams } from '../../lib/types';

type CitySize = 'a2' | 'us-letter' | '16x20' | '18x24';
type FontPresetKey = 'calligraphy' | 'serif' | 'gothic' | 'times';
type MapStyleKey = 'mono' | 'natural' | 'earth' | 'old-navy' | 'coral' | 'teal' | 'cobalt' | 'noir';

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

const SIZE_PRESETS: { key: CitySize; title: string; sub: string; compact?: boolean }[] = [
  { key: 'a2', title: 'A2', sub: '420 x 594 mm' },
  { key: 'us-letter', title: 'US Letter', sub: '8.5 x 11 in', compact: true },
  { key: '16x20', title: '16 x 20', sub: '16 x 20 in', compact: true },
  { key: '18x24', title: '18 x 24', sub: '18 x 24 in', compact: true }
];

const FONT_PRESETS: { key: FontPresetKey; label: string }[] = [
  { key: 'calligraphy', label: 'Calligraphy' },
  { key: 'serif', label: 'Serif' },
  { key: 'gothic', label: 'Gothic' },
  { key: 'times', label: 'Times New Roman' }
];

const MAP_STYLES: { key: MapStyleKey; label: string }[] = [
  { key: 'mono', label: 'Mono' },
  { key: 'natural', label: 'Natural' },
  { key: 'earth', label: 'Earth' },
  { key: 'old-navy', label: 'Old Navy' },
  { key: 'coral', label: 'Coral' },
  { key: 'teal', label: 'Teal' },
  { key: 'cobalt', label: 'Cobalt' },
  { key: 'noir', label: 'Noir' }
];

const CITY_PALETTES: { key: PosterParams['palette']; label: string; bg: string; ink: string; tone: 'dark' | 'light' }[] = [
  { key: 'sand', label: 'Sand', bg: '#f7f3e8', ink: '#1b1b1b', tone: 'light' },
  { key: 'pearl', label: 'Pearl', bg: '#f2f0ea', ink: '#202020', tone: 'light' },
  { key: 'cream-ink', label: 'Cream', bg: '#fbf5ea', ink: '#1b1b1b', tone: 'light' },
  { key: 'storm-gray', label: 'Storm', bg: '#2a2f39', ink: '#e8e9ee', tone: 'dark' },
  { key: 'midnight', label: 'Midnight', bg: '#0b1020', ink: '#ffffff', tone: 'dark' },
  { key: 'twilight-blue', label: 'Twilight', bg: '#1f2a44', ink: '#d7e3ff', tone: 'dark' }
];

function findPalette(paletteKey: PosterParams['palette']) {
  return CITY_PALETTES.find((p) => p.key === paletteKey) ?? CITY_PALETTES[0];
}

function mapFontPreset(fontPreset: FontPresetKey): { titleFont: 'prata' | 'serif' | 'sans'; namesFont: 'jimmy-script' | 'serif' | 'sans'; metaFont: 'signika' | 'serif' | 'sans' } {
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

function formatDateLine(dateIso: string, place: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const datePart = Number.isNaN(d.getTime())
    ? dateIso
    : new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(d);
  return place.trim() ? `${datePart}, ${place}` : datePart;
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
    <button type="button" onClick={() => onChange(!checked)} className="toggleRow" aria-pressed={checked}>
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span className="knob" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function CityMapPage() {
  const [size, setSize] = useState<CitySize>('16x20');
  const [frameOn, setFrameOn] = useState(true);
  const [palette, setPalette] = useState<PosterParams['palette']>('sand');
  const [cityQuery, setCityQuery] = useState('New York, USA');
  const [locationLabel, setLocationLabel] = useState('New York, USA');
  const [lat, setLat] = useState(40.7128);
  const [lon, setLon] = useState(-74.006);
  const [date, setDate] = useState('2026-02-13');
  const [geoExpanded, setGeoExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [fontPreset, setFontPreset] = useState<FontPresetKey>('serif');
  const [title, setTitle] = useState('New York');
  const [subtitle, setSubtitle] = useState('United States');
  const [metaText, setMetaText] = useState('40.7128 N, 74.0060 W');
  const [metaDirty, setMetaDirty] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('mono');
  const [showMarker, setShowMarker] = useState(false);
  const [posterSvg, setPosterSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latestRequestRef = useRef(0);

  const selectedPalette = useMemo(() => findPalette(palette), [palette]);
  const effectiveTheme = selectedPalette.tone;

  useEffect(() => {
    if (metaDirty) return;
    setMetaText(formatDateLine(date, normalizePlaceLabel(locationLabel || cityQuery)));
  }, [cityQuery, date, locationLabel, metaDirty]);

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
        setSuggestions(data.slice(0, 4));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  const previewBg = useMemo(
    () =>
      effectiveTheme === 'dark'
        ? 'radial-gradient(1200px 700px at 50% 30%, #eceff3 0%, #d8dde5 55%, #ced4de 100%)'
        : 'radial-gradient(1200px 700px at 50% 30%, #ffffff 0%, #f4f5f6 55%, #eceeef 100%)',
    [effectiveTheme]
  );

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
      const mappedFont = mapFontPreset(fontPreset);
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const payload = {
        latitude: lat,
        longitude: lon,
        locationLabel: cleanPlace || 'Custom location',
        size,
        palette,
        inkColor: selectedPalette.ink,
        border: frameOn,
        borderWidth: 2,
        borderInset: 14,
        zoom,
        monochrome: mapStyle === 'mono',
        mapStyle,
        showMarker,
        title,
        subtitle,
        metaText: metaText.trim() || formatDateLine(date, cleanPlace),
        ...mappedFont,
        titleFontSize: size === 'us-letter' ? 34 : size === 'a2' ? 64 : 50,
        namesFontSize: size === 'us-letter' ? 20 : size === 'a2' ? 34 : 28,
        metaFontSize: size === 'us-letter' ? 11 : size === 'a2' ? 18 : 15
      };

      const res = await fetch('/api/citymap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.text()) || 'City map generation failed');
      const svg = await res.text();
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
    lon,
    metaText,
    mapStyle,
    palette,
    selectedPalette.ink,
    showMarker,
    size,
    subtitle,
    title,
    zoom
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
            <div className="brandMain">CITY MAP</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <nav className="menu">
          <a href="/design">Star Map</a>
          <a href="/what-is-star-map">What is Star Map?</a>
          <a href="/faq">FAQ</a>
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
                <div key={item.key} className="sizeOption">
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
              <button type="button" className={`frameBtn ${frameOn ? 'active' : ''}`} onClick={() => setFrameOn(true)}>
                <span className="frameIcon">[]</span>
                <small>Default Frame</small>
              </button>
              <button type="button" className={`frameBtn ${!frameOn ? 'active' : ''}`} onClick={() => setFrameOn(false)}>
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
                {CITY_PALETTES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`paletteBtn ${palette === p.key ? 'active' : ''}`}
                    title={p.label}
                    onClick={() => setPalette(p.key)}
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
                  aria-label={geoExpanded ? 'Hide coordinates' : 'Show coordinates'}
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
                  <input type="number" value={lat} step={0.0001} onChange={(e) => setLat(Number(e.target.value))} />
                </div>
                <div className="fieldGroup">
                  <label>Longitude:</label>
                  <input type="number" value={lon} step={0.0001} onChange={(e) => setLon(Number(e.target.value))} />
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
              <label>Zoom:</label>
              <input type="range" min={4} max={19} step={1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </div>
            <p className="hint">Zoom: {zoom} (range expanded for more zoom-in / zoom-out)</p>
            <div className="fieldGroup">
              <label>Model:</label>
              <select value={mapStyle} onChange={(e) => setMapStyle(e.target.value as MapStyleKey)}>
                {MAP_STYLES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <Toggle checked={showMarker} onChange={setShowMarker} label="Show center marker" />
          </div>

          <div className="panelBlock softC">
            <div className="fieldGroup">
              <label>Title:</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <label>Subtitle:</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div className="fieldGroup">
              <label>Location:</label>
              <input
                value={metaText}
                onChange={(e) => {
                  setMetaText(e.target.value);
                  setMetaDirty(true);
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
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }
        .sizeBtn span {
          font-size: 22px;
          font-weight: 700;
          white-space: nowrap;
        }
        .sizeBtn.compact span {
          font-size: 17px;
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
        }
        .frameBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff, 0 6px 14px rgba(47, 116, 255, 0.16);
          background: #edf3ff;
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
        }
        .panelBlock.softB {
          background: #f8f6fb;
        }
        .panelBlock.softC {
          background: #f6faf7;
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
        input[type='range'] {
          padding: 0;
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
