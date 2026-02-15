#!/usr/bin/env python3
"""
Mapbox minimal city-map quality test (static outputs + pricing projection).

What this script does:
1) Downloads Mapbox Static Images for multiple styles and zoom levels.
2) Generates minimal-looking post-processed variants from each image.
3) Creates poster mock outputs to quickly evaluate printable quality.
4) Writes an interactive local HTML map test page (zoom/pan/style switch).
5) Produces Vector Tiles API cost projection based on your expected traffic.

Examples:
  python3 test-scripts/generate_mapbox_minimal_tests.py
  python3 test-scripts/generate_mapbox_minimal_tests.py \
    --city "San Antonio, Texas, USA" --lat 29.4241 --lon -98.4936 \
    --zoom-levels 11,12,13,14 --monthly-sessions 5000
"""

from __future__ import annotations

import argparse
import json
import math
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import requests
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


USER_AGENT = "space-map-mapbox-tests/1.0"

DEFAULT_STYLES: List[Tuple[str, str]] = [
  ("light", "mapbox/light-v11"),
  ("streets", "mapbox/streets-v12"),
  ("dark", "mapbox/dark-v11"),
  ("satellite-streets", "mapbox/satellite-streets-v12"),
]

# Based on Mapbox Vector Tiles API pricing tiers (verify in dashboard before launch).
# Screenshot-shared tiers:
# - up to 200k: free
# - 200,001 to 2M: $0.25 / 1,000
# - 2,000,001 to 4M: $0.20 / 1,000
# - 4,000,001+: $0.15 / 1,000
VECTOR_TILE_TIERS: List[Tuple[int, float]] = [
  (200_000, 0.00),
  (2_000_000, 0.25),
  (4_000_000, 0.20),
  (10**12, 0.15),
]


def load_dotenv(path: Path) -> None:
  if not path.exists():
    return
  for line in path.read_text(encoding="utf-8").splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
      continue
    key, val = s.split("=", 1)
    key = key.strip()
    val = val.strip().strip('"').strip("'")
    if key and key not in os.environ:
      os.environ[key] = val


def slugify(s: str) -> str:
  out = []
  for ch in s.lower():
    if ch.isalnum():
      out.append(ch)
    else:
      out.append("-")
  slug = "".join(out)
  while "--" in slug:
    slug = slug.replace("--", "-")
  return slug.strip("-")


def parse_styles(raw: str) -> List[Tuple[str, str]]:
  if not raw.strip():
    return DEFAULT_STYLES
  pairs: List[Tuple[str, str]] = []
  for item in raw.split(","):
    p = item.strip()
    if not p:
      continue
    if ":" in p:
      name, style_id = p.split(":", 1)
      pairs.append((name.strip(), style_id.strip()))
    else:
      # e.g. "mapbox/light-v11" -> name "light-v11"
      style_id = p
      name = p.split("/")[-1]
      pairs.append((name, style_id))
  return pairs or DEFAULT_STYLES


def parse_zooms(raw: str) -> List[float]:
  out: List[float] = []
  for p in raw.split(","):
    p = p.strip()
    if not p:
      continue
    out.append(float(p))
  return out or [11, 12, 13, 14]


def mapbox_static_url(
  style_id: str,
  lon: float,
  lat: float,
  zoom: float,
  width: int,
  height: int,
  token: str,
) -> str:
  return (
    f"https://api.mapbox.com/styles/v1/{style_id}/static/"
    f"{lon},{lat},{zoom},0/{width}x{height}"
    f"?access_token={token}&logo=false&attribution=false"
  )


def fetch_mapbox_image(url: str, session: requests.Session) -> Image.Image:
  resp = session.get(url, timeout=40)
  resp.raise_for_status()
  return Image.open(BytesIO(resp.content)).convert("RGB")


def minimal_variants(img: Image.Image) -> Dict[str, Image.Image]:
  # Base grayscale
  gray = ImageOps.grayscale(img)
  gray_hi = ImageEnhance.Contrast(gray).enhance(1.8)

  # Line extraction-ish approach
  edges = gray_hi.filter(ImageFilter.FIND_EDGES)
  edges = ImageEnhance.Contrast(edges).enhance(2.4)
  edges_inv = ImageOps.invert(edges)
  bw_lines = edges_inv.point(lambda p: 255 if p > 155 else 0).convert("RGB")

  # Soft minimal: roads darker, water light gray
  soft = gray_hi.point(lambda p: min(255, int(p * 1.15)))
  soft = ImageEnhance.Contrast(soft).enhance(1.35)
  soft_rgb = ImageOps.colorize(soft, black="#111111", white="#f2f2f2").convert("RGB")

  # Strong black-white with roads punch
  road_boost = ImageChops.multiply(gray_hi.convert("RGB"), bw_lines)
  road_boost = ImageEnhance.Contrast(road_boost).enhance(1.35)

  return {
    "raw": img,
    "gray": gray_hi.convert("RGB"),
    "soft_minimal": soft_rgb,
    "bw_lines": bw_lines,
    "road_boost": road_boost,
  }


def pick_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
  candidates: List[str] = []
  if bold:
    candidates += [
      "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "/Library/Fonts/Arial Bold.ttf",
    ]
  candidates += [
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
  ]
  for p in candidates:
    if Path(p).exists():
      try:
        return ImageFont.truetype(p, size=size)
      except Exception:
        pass
  return ImageFont.load_default()


def compose_poster(
  map_img: Image.Image,
  out_path: Path,
  title: str,
  subtitle: str,
  lat: float,
  lon: float,
  size: Tuple[int, int] = (2400, 3600),
) -> None:
  w, h = size
  poster = Image.new("RGB", (w, h), "#f7f7f7")
  draw = ImageDraw.Draw(poster)

  margin = int(w * 0.08)
  map_size = w - margin * 2
  map_top = int(h * 0.07)
  map_box = (margin, map_top, margin + map_size, map_top + map_size)

  fitted = ImageOps.fit(map_img, (map_size, map_size), method=Image.Resampling.LANCZOS)
  poster.paste(fitted, (map_box[0], map_box[1]))

  # Inner poster frame
  frame_margin = int(w * 0.03)
  draw.rectangle(
    [frame_margin, frame_margin, w - frame_margin, h - frame_margin],
    outline="#cfcfcf",
    width=4,
  )

  y = map_box[3] + int(h * 0.045)
  title_font = pick_font(110, bold=True)
  subtitle_font = pick_font(72, bold=False)
  meta_font = pick_font(48, bold=False)

  draw.text((w / 2, y), title, fill="#111111", font=title_font, anchor="ma")
  draw.text((w / 2, y + 120), subtitle, fill="#222222", font=subtitle_font, anchor="ma")
  coord = f"{abs(lat):.4f}° {'N' if lat >= 0 else 'S'} · {abs(lon):.4f}° {'E' if lon >= 0 else 'W'}"
  draw.text((w / 2, y + 210), coord, fill="#6a6a6a", font=meta_font, anchor="ma")

  poster.save(out_path)


def make_contact_sheet(items: Sequence[Tuple[str, Path]], out_path: Path, thumb: int = 340, cols: int = 4) -> None:
  if not items:
    return
  rows = math.ceil(len(items) / cols)
  cell_w = thumb + 28
  cell_h = thumb + 60
  sheet = Image.new("RGB", (cols * cell_w + 18, rows * cell_h + 18), "#eef1f6")
  draw = ImageDraw.Draw(sheet)
  font = ImageFont.load_default()

  for i, (name, p) in enumerate(items):
    img = Image.open(p).convert("RGB")
    img = ImageOps.fit(img, (thumb, thumb), method=Image.Resampling.LANCZOS)
    r = i // cols
    c = i % cols
    x = 12 + c * cell_w
    y = 12 + r * cell_h
    sheet.paste(img, (x, y))
    draw.text((x, y + thumb + 10), name, fill="#1f2430", font=font)
  sheet.save(out_path)


def estimate_vector_tile_requests(
  monthly_sessions: int,
  avg_pans: float,
  avg_zooms: float,
  base_tiles_per_load: int,
  tiles_per_pan: int,
  tiles_per_zoom: int,
) -> int:
  per_session = base_tiles_per_load + avg_pans * tiles_per_pan + avg_zooms * tiles_per_zoom
  return int(round(monthly_sessions * per_session))


def compute_tiered_cost(tile_requests: int) -> Dict[str, object]:
  remaining = tile_requests
  prev_cap = 0
  total_cost = 0.0
  lines = []

  for cap, price_per_1000 in VECTOR_TILE_TIERS:
    if remaining <= 0:
      break
    tier_size = cap - prev_cap
    used_here = min(remaining, tier_size)
    cost_here = (used_here / 1000.0) * price_per_1000
    total_cost += cost_here
    lines.append(
      {
        "range_start": prev_cap + 1 if prev_cap > 0 else 0,
        "range_end": cap if cap < 10**12 else None,
        "requests": used_here,
        "price_per_1000_usd": price_per_1000,
        "cost_usd": round(cost_here, 4),
      }
    )
    remaining -= used_here
    prev_cap = cap

  return {"tile_requests": tile_requests, "estimated_cost_usd": round(total_cost, 2), "breakdown": lines}


def build_scenarios(
  avg_pans: float,
  avg_zooms: float,
  base_tiles_per_load: int,
  tiles_per_pan: int,
  tiles_per_zoom: int,
) -> List[Dict[str, object]]:
  scenarios = []
  for sessions in (1000, 5000, 10_000, 20_000, 50_000):
    reqs = estimate_vector_tile_requests(
      monthly_sessions=sessions,
      avg_pans=avg_pans,
      avg_zooms=avg_zooms,
      base_tiles_per_load=base_tiles_per_load,
      tiles_per_pan=tiles_per_pan,
      tiles_per_zoom=tiles_per_zoom,
    )
    cost = compute_tiered_cost(reqs)
    scenarios.append(
      {
        "monthly_sessions": sessions,
        "estimated_tile_requests": reqs,
        "estimated_monthly_cost_usd": cost["estimated_cost_usd"],
      }
    )
  return scenarios


def write_interactive_html(out_path: Path, token: str, lat: float, lon: float, city: str) -> None:
  html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mapbox Interactive Test - {city}</title>
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    html, body {{ margin:0; height:100%; background:#ece8e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }}
    #map {{ position:absolute; inset:0; }}
    .panel {{
      position:absolute; top:16px; left:16px; z-index:2; width:360px; max-width:calc(100vw - 32px);
      background:#fff; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.15); padding:14px;
    }}
    .panel h3 {{ margin:0 0 10px; font-size:16px; }}
    .row {{ display:flex; gap:8px; margin-bottom:8px; }}
    button, select, input[type="text"] {{
      min-height:34px; border:1px solid #ced4e1; border-radius:8px; background:#fff; cursor:pointer; padding:0 10px;
    }}
    .grid2 {{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px; }}
    .field {{ display:flex; flex-direction:column; gap:6px; margin-bottom:8px; font-size:12px; color:#3a4152; }}
    .field input[type="color"] {{ width:100%; height:34px; border:1px solid #ced4e1; border-radius:8px; background:#fff; }}
    .field input[type="range"] {{ width:100%; }}
    .hint {{ font-size:11px; color:#6b7280; line-height:1.35; margin:2px 0 8px; }}
    .slider-label {{ display:flex; justify-content:space-between; align-items:center; gap:8px; }}
    .slider-value {{ font-variant-numeric: tabular-nums; color:#111827; font-weight:600; }}
    .stats {{ font-size:12px; color:#3a4152; line-height:1.5; margin-top:8px; }}
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="panel">
    <h3>Mapbox Minimal Poster Test</h3>
    <div class="row">
      <button id="presetMinimal">Minimal</button>
      <button id="presetBlueprint">Blueprint</button>
      <button id="presetSepia">Sepia</button>
    </div>
    <div class="row">
      <button id="styleStreets">Base: Streets</button>
      <button id="styleLight">Base: Light</button>
      <button id="styleDark">Base: Dark</button>
    </div>
    <div class="row">
      <input id="locationInput" type="text" placeholder="Search location (e.g. New York)" style="flex:1" />
      <button id="goLocation">Go</button>
    </div>
    <div class="row">
      <label for="z">Zoom:</label>
      <select id="z">
        <option>10</option><option>11</option><option selected>12</option><option>13</option><option>14</option><option>15</option>
      </select>
      <button id="snap">Center Reset</button>
    </div>
    <div class="grid2">
      <div class="field">
        <label>Background</label>
        <input id="bgColor" type="color" value="#ffffff" />
      </div>
      <div class="field">
        <label>Water</label>
        <input id="waterColor" type="color" value="#eceff2" />
      </div>
      <div class="field">
        <label>Motorway</label>
        <input id="motorwayColor" type="color" value="#111111" />
      </div>
      <div class="field">
        <label>Primary roads</label>
        <input id="primaryColor" type="color" value="#2f2f2f" />
      </div>
      <div class="field">
        <label>Minor roads</label>
        <input id="minorColor" type="color" value="#777777" />
      </div>
      <div class="hint">
        <strong>Primary</strong>: ana arter/caddeler. <strong>Minor</strong>: mahalle/sokak yolları.
      </div>
      <div class="field">
        <label>Buildings</label>
        <input id="buildingColor" type="color" value="#e5e5e5" />
      </div>
      <div class="field">
        <label class="slider-label">Motorway width <span id="motorwayWVal" class="slider-value">5.5 px</span></label>
        <input id="motorwayW" type="range" min="1.5" max="10" step="0.5" value="5.5" />
      </div>
      <div class="field">
        <label class="slider-label">Primary width <span id="primaryWVal" class="slider-value">3.2 px</span></label>
        <input id="primaryW" type="range" min="1" max="8" step="0.5" value="3.2" />
      </div>
      <div class="field">
        <label class="slider-label">Minor width <span id="minorWVal" class="slider-value">1.2 px</span></label>
        <input id="minorW" type="range" min="0.3" max="4" step="0.2" value="1.2" />
      </div>
    </div>
    <div class="stats">
      <div>Tile events: <span id="tileCount">0</span></div>
      <div>Zoom: <span id="zoomLabel">12.00</span></div>
      <div>Center: <span id="centerLabel">{lon:.4f}, {lat:.4f}</span></div>
      <div id="searchStatus"></div>
    </div>
  </div>
  <script>
    mapboxgl.accessToken = "{token}";
    let tileCount = 0;
    const center = [{lon}, {lat}];

    const BASE_STYLES = {{
      streets: "mapbox://styles/mapbox/streets-v11",
      light: "mapbox://styles/mapbox/light-v11",
      dark: "mapbox://styles/mapbox/dark-v11"
    }};

    const map = new mapboxgl.Map({{
      container: 'map',
      style: BASE_STYLES.streets,
      center,
      zoom: 12,
      maxZoom: 18,
      minZoom: 8
    }});
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const tileCountEl = document.getElementById('tileCount');
    const zoomLabel = document.getElementById('zoomLabel');
    const centerLabel = document.getElementById('centerLabel');
    const searchStatusEl = document.getElementById('searchStatus');
    const locationInputEl = document.getElementById('locationInput');
    map.on('sourcedata', (e) => {{
      if (e.tile) {{
        tileCount += 1;
        tileCountEl.textContent = String(tileCount);
      }}
    }});
    map.on('move', () => {{
      const c = map.getCenter();
      zoomLabel.textContent = map.getZoom().toFixed(2);
      centerLabel.textContent = `${{c.lng.toFixed(4)}}, ${{c.lat.toFixed(4)}}`;
    }});

    function trySetLayout(id, prop, value) {{
      try {{
        if (map.getLayer(id)) map.setLayoutProperty(id, prop, value);
      }} catch (_e) {{}}
    }}

    function trySetPaint(id, prop, value) {{
      try {{
        if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
      }} catch (_e) {{}}
    }}

    function widthExpr(base) {{
      return ["interpolate", ["linear"], ["zoom"], 10, base * 0.35, 14, base, 18, base * 1.9];
    }}

    function activeParams() {{
      return {{
        bg: document.getElementById("bgColor").value,
        water: document.getElementById("waterColor").value,
        motorway: document.getElementById("motorwayColor").value,
        primary: document.getElementById("primaryColor").value,
        minor: document.getElementById("minorColor").value,
        building: document.getElementById("buildingColor").value,
        motorwayW: parseFloat(document.getElementById("motorwayW").value),
        primaryW: parseFloat(document.getElementById("primaryW").value),
        minorW: parseFloat(document.getElementById("minorW").value),
      }};
    }}

    function layerIdFlags(id) {{
      const s = id.toLowerCase();
      return {{
        isMotorway: s.includes("motorway") || s.includes("trunk"),
        isPrimary: s.includes("primary") || s.includes("secondary") || s.includes("tertiary"),
        isMinorRoad: s.includes("road") || s.includes("street") || s.includes("path") || s.includes("service") || s.includes("track"),
        isWater: s.includes("water"),
        isWaterLabel: s.includes("waterway-label") || s.includes("marine-label"),
        isBuilding: s.includes("building"),
        isPoi: s.includes("poi") || s.includes("airport") || s.includes("transit"),
        isPlaceLabel: s.includes("place") || s.includes("settlement") || s.includes("road-label") || s.includes("housenum"),
        isBoundary: s.includes("boundary") || s.includes("admin"),
        isLand: s.includes("landuse") || s.includes("landcover") || s.includes("park") || s.includes("green"),
      }};
    }}

    function applyMinimalToLoadedStyle() {{
      const p = activeParams();
      const style = map.getStyle();
      if (!style || !style.layers) return;

      style.layers.forEach((layer) => {{
        const id = layer.id;
        const f = layerIdFlags(id);

        if (layer.type === "symbol") {{
          if (f.isPoi || f.isPlaceLabel || f.isWaterLabel) {{
            trySetLayout(id, "visibility", "none");
          }}
          return;
        }}

        if (f.isBoundary) {{
          trySetLayout(id, "visibility", "none");
          return;
        }}

        if (layer.type === "background") {{
          trySetPaint(id, "background-color", p.bg);
          return;
        }}

        if (layer.type === "fill") {{
          if (f.isWater) {{
            trySetPaint(id, "fill-color", p.water);
            trySetPaint(id, "fill-opacity", 1);
            return;
          }}
          if (f.isBuilding) {{
            trySetPaint(id, "fill-color", p.building);
            trySetPaint(id, "fill-opacity", 0.3);
            return;
          }}
          if (f.isLand) {{
            trySetPaint(id, "fill-color", p.bg);
            trySetPaint(id, "fill-opacity", 0.92);
            return;
          }}
        }}

        if (layer.type === "line") {{
          if (f.isWater && !f.isWaterLabel) {{
            trySetPaint(id, "line-color", p.water);
            trySetPaint(id, "line-width", widthExpr(0.8));
            return;
          }}
          if (f.isMotorway) {{
            trySetPaint(id, "line-color", p.motorway);
            trySetPaint(id, "line-width", widthExpr(p.motorwayW));
            trySetPaint(id, "line-opacity", 0.95);
            return;
          }}
          if (f.isPrimary) {{
            trySetPaint(id, "line-color", p.primary);
            trySetPaint(id, "line-width", widthExpr(p.primaryW));
            trySetPaint(id, "line-opacity", 0.9);
            return;
          }}
          if (f.isMinorRoad) {{
            trySetPaint(id, "line-color", p.minor);
            trySetPaint(id, "line-width", widthExpr(p.minorW));
            trySetPaint(id, "line-opacity", 0.85);
            return;
          }}
        }}
      }});
    }}

    function applyLiveColors() {{
      syncSliderValueLabels();
      applyMinimalToLoadedStyle();
    }}

    function syncSliderValueLabels() {{
      document.getElementById("motorwayWVal").textContent = `${{parseFloat(document.getElementById("motorwayW").value).toFixed(1)}} px`;
      document.getElementById("primaryWVal").textContent = `${{parseFloat(document.getElementById("primaryW").value).toFixed(1)}} px`;
      document.getElementById("minorWVal").textContent = `${{parseFloat(document.getElementById("minorW").value).toFixed(1)}} px`;
    }}

    function applyPreset(name) {{
      const presets = {{
        minimal: {{
          bg: "#ffffff", water: "#eceff2", motorway: "#111111", primary: "#2f2f2f", minor: "#777777", building: "#e5e5e5",
          motorwayW: 5.5, primaryW: 3.2, minorW: 1.2
        }},
        blueprint: {{
          bg: "#0f1730", water: "#1a2c5a", motorway: "#f6f8ff", primary: "#c4d3ff", minor: "#90a5e7", building: "#273c76",
          motorwayW: 5.0, primaryW: 3.0, minorW: 1.1
        }},
        sepia: {{
          bg: "#f3e8d8", water: "#d7c8b1", motorway: "#3a2b1f", primary: "#5d4736", minor: "#8e7762", building: "#e7d7bf",
          motorwayW: 5.2, primaryW: 3.1, minorW: 1.3
        }}
      }};
      const p = presets[name];
      document.getElementById("bgColor").value = p.bg;
      document.getElementById("waterColor").value = p.water;
      document.getElementById("motorwayColor").value = p.motorway;
      document.getElementById("primaryColor").value = p.primary;
      document.getElementById("minorColor").value = p.minor;
      document.getElementById("buildingColor").value = p.building;
      document.getElementById("motorwayW").value = String(p.motorwayW);
      document.getElementById("primaryW").value = String(p.primaryW);
      document.getElementById("minorW").value = String(p.minorW);
      syncSliderValueLabels();
      applyLiveColors();
    }}

    ["bgColor", "waterColor", "motorwayColor", "primaryColor", "minorColor", "buildingColor", "motorwayW", "primaryW", "minorW"]
      .forEach((id) => document.getElementById(id).addEventListener("input", applyLiveColors));

    function switchBase(name) {{
      const next = BASE_STYLES[name];
      if (!next) return;
      map.setStyle(next);
    }}

    document.getElementById("styleStreets").addEventListener("click", () => switchBase("streets"));
    document.getElementById("styleLight").addEventListener("click", () => switchBase("light"));
    document.getElementById("styleDark").addEventListener("click", () => switchBase("dark"));

    document.getElementById("presetMinimal").addEventListener("click", () => applyPreset("minimal"));
    document.getElementById("presetBlueprint").addEventListener("click", () => applyPreset("blueprint"));
    document.getElementById("presetSepia").addEventListener("click", () => applyPreset("sepia"));

    async function goToLocationByName() {{
      const q = (locationInputEl.value || "").trim();
      if (!q) return;
      searchStatusEl.textContent = "Searching...";
      try {{
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${{encodeURIComponent(q)}}.json?access_token=${{mapboxgl.accessToken}}&limit=1`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${{resp.status}}`);
        const data = await resp.json();
        const feat = data?.features?.[0];
        if (!feat?.center) {{
          searchStatusEl.textContent = "Location not found.";
          return;
        }}
        const nextCenter = feat.center;
        map.flyTo({{ center: nextCenter, zoom: Math.max(12, map.getZoom()), duration: 1000 }});
        locationInputEl.value = feat.place_name || q;
        searchStatusEl.textContent = "";
      }} catch (_e) {{
        searchStatusEl.textContent = "Search failed.";
      }}
    }}

    document.getElementById("goLocation").addEventListener("click", goToLocationByName);
    locationInputEl.addEventListener("keydown", (e) => {{
      if (e.key === "Enter") {{
        e.preventDefault();
        goToLocationByName();
      }}
    }});

    map.on("style.load", () => {{
      syncSliderValueLabels();
      applyPreset("minimal");
    }});

    document.getElementById('z').addEventListener('change', (e) => {{
      map.zoomTo(parseFloat(e.target.value), {{ duration: 450 }});
    }});
    document.getElementById('snap').addEventListener('click', () => map.flyTo({{center, zoom: 12, duration: 700}}));
  </script>
</body>
</html>"""
  out_path.write_text(html, encoding="utf-8")


def maybe_serve(directory: Path, port: int) -> None:
  class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
      return

  os.chdir(directory)
  server = ThreadingHTTPServer(("127.0.0.1", port), QuietHandler)
  print(f"[serve] http://127.0.0.1:{port}")
  print("[serve] stop with Ctrl+C")
  try:
    server.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    server.server_close()


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--city", default="San Antonio, Texas, USA")
  parser.add_argument("--lat", type=float, default=29.4241)
  parser.add_argument("--lon", type=float, default=-98.4936)
  parser.add_argument("--zoom-levels", default="11,12,13,14")
  parser.add_argument("--styles", default="")
  parser.add_argument("--width", type=int, default=1280)
  parser.add_argument("--height", type=int, default=1280)
  parser.add_argument("--dotenv", default=".env")
  parser.add_argument("--dotenv-extra", default="test-scripts/.env")
  parser.add_argument("--out-dir", default="test-scripts/mapbox-minimal-tests")
  parser.add_argument("--monthly-sessions", type=int, default=5000)
  parser.add_argument("--avg-pans", type=float, default=6.0)
  parser.add_argument("--avg-zooms", type=float, default=4.0)
  parser.add_argument("--base-tiles-per-load", type=int, default=22)
  parser.add_argument("--tiles-per-pan", type=int, default=8)
  parser.add_argument("--tiles-per-zoom", type=int, default=12)
  parser.add_argument("--serve", action="store_true")
  parser.add_argument("--serve-port", type=int, default=8787)
  args = parser.parse_args()

  load_dotenv(Path(args.dotenv))
  load_dotenv(Path(args.dotenv_extra))

  token = (os.getenv("MAPBOX_API_KEY") or os.getenv("MAPBOX_ACCESS_TOKEN") or "").strip()
  if not token:
    raise SystemExit("MAPBOX_API_KEY or MAPBOX_ACCESS_TOKEN not found in env.")

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)
  raw_dir = out_dir / "raw"
  variants_dir = out_dir / "variants"
  posters_dir = out_dir / "posters"
  for d in (raw_dir, variants_dir, posters_dir):
    d.mkdir(parents=True, exist_ok=True)

  styles = parse_styles(args.styles)
  zooms = parse_zooms(args.zoom_levels)
  session = requests.Session()
  session.headers.update({"User-Agent": USER_AGENT})

  saved_for_sheet: List[Tuple[str, Path]] = []
  saved_for_poster: List[Tuple[str, Path]] = []
  report_rows: List[Dict[str, object]] = []

  print(f"[info] City: {args.city} ({args.lat}, {args.lon})")
  print(f"[info] Styles: {len(styles)} | Zoom levels: {zooms}")
  for style_name, style_id in styles:
    for zoom in zooms:
      label = f"{style_name}_z{zoom:g}"
      print(f"[mapbox] {label} ...", end="", flush=True)
      t0 = time.time()
      url = mapbox_static_url(style_id, args.lon, args.lat, zoom, args.width, args.height, token)
      try:
        base = fetch_mapbox_image(url, session)
      except Exception as e:
        print(f" failed ({e})")
        report_rows.append({"label": label, "style_id": style_id, "zoom": zoom, "status": "failed", "error": str(e)})
        continue
      elapsed = round(time.time() - t0, 3)
      print(" ok")

      raw_path = raw_dir / f"{label}.png"
      base.save(raw_path)

      variants = minimal_variants(base)
      for var_name, var_img in variants.items():
        out = variants_dir / f"{label}__{var_name}.png"
        var_img.save(out)
        saved_for_sheet.append((f"{label}::{var_name}", out))
        if var_name in ("raw", "soft_minimal", "bw_lines"):
          saved_for_poster.append((f"{label}::{var_name}", out))

      report_rows.append(
        {
          "label": label,
          "style_id": style_id,
          "zoom": zoom,
          "status": "ok",
          "fetch_seconds": elapsed,
          "raw_file": str(raw_path),
          "request_url_redacted": url.replace(token, "***"),
        }
      )

  # Poster mocks (first 8 samples)
  city_main = args.city.split(",")[0].strip() if args.city.strip() else "City"
  city_sub = args.city.split(",")[1].strip() if "," in args.city else ""
  for idx, (name, path) in enumerate(saved_for_poster[:8], start=1):
    img = Image.open(path).convert("RGB")
    poster_path = posters_dir / f"poster_{idx:02d}_{slugify(name)}.png"
    compose_poster(img, poster_path, city_main, city_sub, args.lat, args.lon)

  if saved_for_sheet:
    make_contact_sheet(saved_for_sheet[:24], out_dir / "contact_sheet.png", thumb=300, cols=4)

  # Interactive HTML test
  write_interactive_html(out_dir / "interactive_mapbox_test.html", token, args.lat, args.lon, args.city)

  # Cost projection
  estimated_requests = estimate_vector_tile_requests(
    monthly_sessions=args.monthly_sessions,
    avg_pans=args.avg_pans,
    avg_zooms=args.avg_zooms,
    base_tiles_per_load=args.base_tiles_per_load,
    tiles_per_pan=args.tiles_per_pan,
    tiles_per_zoom=args.tiles_per_zoom,
  )
  cost = compute_tiered_cost(estimated_requests)
  scenario_table = build_scenarios(
    avg_pans=args.avg_pans,
    avg_zooms=args.avg_zooms,
    base_tiles_per_load=args.base_tiles_per_load,
    tiles_per_pan=args.tiles_per_pan,
    tiles_per_zoom=args.tiles_per_zoom,
  )

  report = {
    "city": args.city,
    "lat": args.lat,
    "lon": args.lon,
    "width": args.width,
    "height": args.height,
    "zooms": zooms,
    "styles": [{"name": n, "style_id": sid} for n, sid in styles],
    "results": report_rows,
    "vector_tile_projection": {
      "assumptions": {
        "monthly_sessions": args.monthly_sessions,
        "avg_pans_per_session": args.avg_pans,
        "avg_zooms_per_session": args.avg_zooms,
        "base_tiles_per_load": args.base_tiles_per_load,
        "tiles_per_pan": args.tiles_per_pan,
        "tiles_per_zoom": args.tiles_per_zoom,
      },
      "pricing_tiers_source_note": "Mapbox pricing page + your provided Vector Tiles tiers snapshot. Re-check before production lock.",
      "estimate": cost,
      "scenario_table": scenario_table,
    },
    "artifacts": {
      "raw_dir": str(raw_dir),
      "variants_dir": str(variants_dir),
      "posters_dir": str(posters_dir),
      "contact_sheet": str(out_dir / "contact_sheet.png"),
      "interactive_html": str(out_dir / "interactive_mapbox_test.html"),
    },
  }
  report_path = out_dir / "report.json"
  report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

  print(f"[done] report: {report_path}")
  print(f"[done] interactive: {out_dir / 'interactive_mapbox_test.html'}")
  print(
    "[cost] vector tiles estimate: "
    f"{cost['tile_requests']} requests/month -> ${cost['estimated_cost_usd']} / month"
  )

  if args.serve:
    maybe_serve(out_dir, args.serve_port)


if __name__ == "__main__":
  main()
