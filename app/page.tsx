'use client';

import { useEffect, useMemo, useState } from 'react';

type RenderParams = {
  theme: 'light' | 'dark';
  showAzimuthScale: boolean;
  labelConstellations: boolean;
  labelBrightStars?: boolean;
  starMode: 'none' | 'constellations' | 'all';
  magnitudeLimit: number;
  minStarSize: number;
  starSizeMin: number;
  starSizeMax: number;
  starSizeGamma: number;
  starAlpha: number;
  emphasizeVertices: boolean;
  vertexSizeMin: number;
  vertexSizeMax: number;
  vertexSizeGamma: number;
  vertexAlpha: number;
  constellationLineWidth: number;
  constellationLineAlpha: number;
  eclipticAlpha: number;
};

const defaultParams: RenderParams = {
  theme: 'light',
  showAzimuthScale: true,
  labelConstellations: true,
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
  eclipticAlpha: 0.35
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
      <div style={{ color: '#333' }}>{label}</div>
      {children}
    </label>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseBool(v: string | null, fallback: boolean) {
  if (v === null) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function parseNum(v: string | null, fallback: number) {
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function encodeStateToQuery(input: {
  locationMode: 'city' | 'latlon';
  cityQuery: string;
  lat: number;
  lon: number;
  dateTime: string;
  locationLabelOverride: string;
  params: RenderParams;
}) {
  const sp = new URLSearchParams();
  sp.set('mode', input.locationMode);
  sp.set('q', input.cityQuery);
  sp.set('lat', String(input.lat));
  sp.set('lon', String(input.lon));
  sp.set('dt', input.dateTime);
  if (input.locationLabelOverride) sp.set('label', input.locationLabelOverride);

  const p = input.params;
  sp.set('theme', p.theme);
  sp.set('az', p.showAzimuthScale ? '1' : '0');
  sp.set('cl', p.labelConstellations ? '1' : '0');
  sp.set('sm', p.starMode);
  sp.set('ml', String(p.magnitudeLimit));
  sp.set('mss', String(p.minStarSize));
  sp.set('ssmin', String(p.starSizeMin));
  sp.set('ssmax', String(p.starSizeMax));
  sp.set('ssg', String(p.starSizeGamma));
  sp.set('sa', String(p.starAlpha));
  sp.set('ev', p.emphasizeVertices ? '1' : '0');
  sp.set('vsmin', String(p.vertexSizeMin));
  sp.set('vsmax', String(p.vertexSizeMax));
  sp.set('vsg', String(p.vertexSizeGamma));
  sp.set('va', String(p.vertexAlpha));
  sp.set('lw', String(p.constellationLineWidth));
  sp.set('la', String(p.constellationLineAlpha));
  sp.set('ea', String(p.eclipticAlpha));
  return sp.toString();
}

function decodeStateFromQuery(): Partial<{
  locationMode: 'city' | 'latlon';
  cityQuery: string;
  lat: number;
  lon: number;
  dateTime: string;
  locationLabelOverride: string;
  params: RenderParams;
}> {
  const sp = new URLSearchParams(window.location.search);
  const mode = sp.get('mode');
  const theme = sp.get('theme');
  const sm = sp.get('sm');

  const params: RenderParams = {
    ...defaultParams,
    theme: theme === 'dark' ? 'dark' : 'light',
    showAzimuthScale: parseBool(sp.get('az'), defaultParams.showAzimuthScale),
    labelConstellations: parseBool(sp.get('cl'), defaultParams.labelConstellations),
    starMode: sm === 'none' || sm === 'constellations' || sm === 'all' ? sm : defaultParams.starMode,
    magnitudeLimit: parseNum(sp.get('ml'), defaultParams.magnitudeLimit),
    minStarSize: parseNum(sp.get('mss'), defaultParams.minStarSize),
    starSizeMin: parseNum(sp.get('ssmin'), defaultParams.starSizeMin),
    starSizeMax: parseNum(sp.get('ssmax'), defaultParams.starSizeMax),
    starSizeGamma: parseNum(sp.get('ssg'), defaultParams.starSizeGamma),
    starAlpha: parseNum(sp.get('sa'), defaultParams.starAlpha),
    emphasizeVertices: parseBool(sp.get('ev'), defaultParams.emphasizeVertices),
    vertexSizeMin: parseNum(sp.get('vsmin'), defaultParams.vertexSizeMin),
    vertexSizeMax: parseNum(sp.get('vsmax'), defaultParams.vertexSizeMax),
    vertexSizeGamma: parseNum(sp.get('vsg'), defaultParams.vertexSizeGamma),
    vertexAlpha: parseNum(sp.get('va'), defaultParams.vertexAlpha),
    constellationLineWidth: parseNum(sp.get('lw'), defaultParams.constellationLineWidth),
    constellationLineAlpha: parseNum(sp.get('la'), defaultParams.constellationLineAlpha),
    eclipticAlpha: parseNum(sp.get('ea'), defaultParams.eclipticAlpha)
  };

  return {
    locationMode: mode === 'latlon' ? 'latlon' : mode === 'city' ? 'city' : undefined,
    cityQuery: sp.get('q') ?? undefined,
    lat: sp.get('lat') ? parseNum(sp.get('lat'), 0) : undefined,
    lon: sp.get('lon') ? parseNum(sp.get('lon'), 0) : undefined,
    dateTime: sp.get('dt') ?? undefined,
    locationLabelOverride: sp.get('label') ?? undefined,
    params
  };
}

export default function Page() {
  const [locationMode, setLocationMode] = useState<'city' | 'latlon'>('city');
  const [cityQuery, setCityQuery] = useState('Istanbul, Turkey');
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [dateTime, setDateTime] = useState('2026-02-12T11:50');
  const [locationLabelOverride, setLocationLabelOverride] = useState('');
  const [params, setParams] = useState<RenderParams>(defaultParams);
  const [svg, setSvg] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');

  const timeUtcIso = useMemo(() => {
    const iso = dateTime.length === 16 ? `${dateTime}:00Z` : `${dateTime}Z`;
    return iso;
  }, [dateTime]);

  async function geocode(): Promise<{ lat: number; lon: number; label: string } | null> {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(cityQuery)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: number; lon: number; label: string }[];
    return data[0] ?? null;
  }

  async function generate() {
    setBusy(true);
    setError('');
    try {
      let latitude = lat;
      let longitude = lon;
      let label = locationLabelOverride || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

      if (locationMode === 'city') {
        const g = await geocode();
        if (!g) throw new Error('Konum bulunamadı.');
        latitude = g.lat;
        longitude = g.lon;
        label = locationLabelOverride || g.label;
        setLat(latitude);
        setLon(longitude);
      }

      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          timeUtcIso,
          locationLabel: label,
          params
        })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Chart generation failed');
      }
      const svgText = await res.text();
      setSvg(svgText);

      const qs = encodeStateToQuery({
        locationMode,
        cityQuery,
        lat: latitude,
        lon: longitude,
        dateTime,
        locationLabelOverride,
        params
      });
      const url = `${window.location.origin}${window.location.pathname}?${qs}`;
      window.history.replaceState(null, '', url);
      setShareLink(url);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const decoded = decodeStateFromQuery();
    if (decoded.locationMode) setLocationMode(decoded.locationMode);
    if (decoded.cityQuery) setCityQuery(decoded.cityQuery);
    if (typeof decoded.lat === 'number') setLat(decoded.lat);
    if (typeof decoded.lon === 'number') setLon(decoded.lon);
    if (decoded.dateTime) setDateTime(decoded.dateTime);
    if (decoded.locationLabelOverride) setLocationLabelOverride(decoded.locationLabelOverride);
    if (decoded.params) setParams(decoded.params);

    // generate after state is applied
    setTimeout(() => generate(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadSvg() {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sky-chart.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    const url = shareLink || `${window.location.href}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // best-effort fallback
      window.prompt('Linki kopyala:', url);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', minHeight: '100vh' }}>
      <div style={{ padding: 18, borderRight: '1px solid #e5e7eb', background: '#fafafa' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Sky Chart</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setLocationMode('city')}
            style={{ padding: '8px 10px', border: '1px solid #ddd', background: locationMode === 'city' ? '#fff' : '#f3f4f6' }}
          >
            Şehir/Ülke
          </button>
          <button
            onClick={() => setLocationMode('latlon')}
            style={{ padding: '8px 10px', border: '1px solid #ddd', background: locationMode === 'latlon' ? '#fff' : '#f3f4f6' }}
          >
            Enlem/Boylam
          </button>
        </div>

        {locationMode === 'city' ? (
          <Field label="Şehir, Ülke">
            <input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} style={{ padding: 10, border: '1px solid #ddd' }} />
          </Field>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Enlem (lat)">
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                step="0.0001"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
            </Field>
            <Field label="Boylam (lon)">
              <input
                type="number"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                step="0.0001"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
            </Field>
          </div>
        )}

        <div style={{ height: 12 }} />
        <Field label="Tarih/Saat (UTC)">
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ padding: 10, border: '1px solid #ddd' }} />
        </Field>

        <div style={{ height: 12 }} />
        <Field label="Etiket (opsiyonel)">
          <input
            value={locationLabelOverride}
            onChange={(e) => setLocationLabelOverride(e.target.value)}
            placeholder="Or: The Night Sky, Istanbul"
            style={{ padding: 10, border: '1px solid #ddd' }}
          />
        </Field>

        <div style={{ height: 14 }} />
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Parametreler</div>

        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Tema">
            <select
              value={params.theme}
              onChange={(e) => setParams((p) => ({ ...p, theme: e.target.value === 'dark' ? 'dark' : 'light' }))}
              style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>

          <Field label="Yıldız modu">
            <select
              value={params.starMode}
              onChange={(e) => {
                const v = e.target.value as RenderParams['starMode'];
                setParams((p) => ({ ...p, starMode: v }));
              }}
              style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
            >
              <option value="all">All</option>
              <option value="constellations">Constellations only</option>
              <option value="none">None</option>
            </select>
          </Field>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.showAzimuthScale}
              onChange={(e) => setParams((p) => ({ ...p, showAzimuthScale: e.target.checked }))}
            />
            Azimut ölçeği (dış halka)
          </label>

          <Field label={`Magnitude limit: ${params.magnitudeLimit.toFixed(1)} (düşür: daha az yıldız)`}>
            <input
              type="range"
              min={3.5}
              max={7.0}
              step={0.1}
              value={params.magnitudeLimit}
              onChange={(e) => setParams((p) => ({ ...p, magnitudeLimit: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Min star size: ${params.minStarSize.toFixed(2)} (artır: kalabalık azalır)`}>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={params.minStarSize}
              onChange={(e) => setParams((p) => ({ ...p, minStarSize: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star size min: ${params.starSizeMin.toFixed(2)}`}>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.05}
              value={params.starSizeMin}
              onChange={(e) => setParams((p) => ({ ...p, starSizeMin: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star size max: ${params.starSizeMax.toFixed(1)} (çok artırma: balon)`}>
            <input
              type="range"
              min={1.0}
              max={20.0}
              step={0.2}
              value={params.starSizeMax}
              onChange={(e) => setParams((p) => ({ ...p, starSizeMax: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star gamma: ${params.starSizeGamma.toFixed(2)} (artır: parlaklar daha hızlı büyür)`}>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={params.starSizeGamma}
              onChange={(e) => setParams((p) => ({ ...p, starSizeGamma: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star alpha: ${params.starAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={params.starAlpha}
              onChange={(e) => setParams((p) => ({ ...p, starAlpha: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Constellation line width: ${params.constellationLineWidth.toFixed(2)}`}>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.05}
              value={params.constellationLineWidth}
              onChange={(e) => setParams((p) => ({ ...p, constellationLineWidth: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Constellation line alpha: ${params.constellationLineAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.05}
              max={1.0}
              step={0.05}
              value={params.constellationLineAlpha}
              onChange={(e) => setParams((p) => ({ ...p, constellationLineAlpha: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Ecliptic alpha: ${params.eclipticAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={params.eclipticAlpha}
              onChange={(e) => setParams((p) => ({ ...p, eclipticAlpha: Number(e.target.value) }))}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={params.emphasizeVertices}
                onChange={(e) => setParams((p) => ({ ...p, emphasizeVertices: e.target.checked }))}
              />
              Köşe yıldızlarını vurgula
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={params.labelConstellations}
                onChange={(e) => setParams((p) => ({ ...p, labelConstellations: e.target.checked }))}
              />
              Takımyıldız isimleri
            </label>
          </div>

          {params.emphasizeVertices ? (
            <div style={{ display: 'grid', gap: 10, padding: 10, background: '#fff', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Köşe Yıldızları</div>
              <Field label={`Vertex min: ${params.vertexSizeMin.toFixed(1)}`}>
                <input
                  type="range"
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  value={params.vertexSizeMin}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeMin: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex max: ${params.vertexSizeMax.toFixed(1)}`}>
                <input
                  type="range"
                  min={1.0}
                  max={40.0}
                  step={0.5}
                  value={params.vertexSizeMax}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeMax: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex gamma: ${params.vertexSizeGamma.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={params.vertexSizeGamma}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeGamma: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex alpha: ${params.vertexAlpha.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={params.vertexAlpha}
                  onChange={(e) => setParams((p) => ({ ...p, vertexAlpha: Number(e.target.value) }))}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div style={{ height: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={generate}
            disabled={busy}
            style={{ padding: '10px 12px', border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' }}
          >
            {busy ? 'Üretiliyor…' : 'Generate'}
          </button>
          <button
            onClick={downloadSvg}
            disabled={!svg}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Download SVG
          </button>
          <button
            onClick={copyLink}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Copy Link
          </button>
        </div>

        {error ? <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>{error}</div> : null}
      </div>

      <div style={{ padding: 18, overflow: 'auto', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ border: '1px solid #e5e7eb', background: '#fff' }} dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Not: Zaman girdisi UTC olarak yorumlanır. PDF için tarayıcıdan yazdır (Print) kullanabilirsin.
          </div>
        </div>
      </div>
    </div>
  );
}
