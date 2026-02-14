#!/usr/bin/env python3
"""
Generate New York city-map samples from multiple providers/styles.

Usage:
  python3 test-scripts/generate_citymap_alternatives.py
  python3 test-scripts/generate_citymap_alternatives.py --city "New York, USA" --lat 40.7128 --lon -74.0060 --zoom 12

Optional API keys (enables extra premium/static variants):
  MAPBOX_TOKEN
  MAPTILER_API_KEY
  GEOAPIFY_API_KEY
"""

from __future__ import annotations

import argparse
import concurrent.futures
import dataclasses
import json
import math
import multiprocessing as mp
import os
import time
from io import BytesIO
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps


USER_AGENT = "space-map-citymap-tests/1.0 (+local-script)"
TILE_SIZE = 256


PRETTYMAPS_LAYER_PROFILES: Dict[str, Dict] = {
  "full": {},
  "lite": {
    "perimeter": {},
    "streets": {
      "width": {
        "motorway": 5,
        "trunk": 5,
        "primary": 4,
        "secondary": 3,
        "tertiary": 2,
        "residential": 1.4,
      }
    },
    "water": {"tags": {"natural": ["water", "bay"]}},
  },
  "streets": {
    "perimeter": {},
    "streets": {
      "width": {
        "motorway": 5,
        "trunk": 5,
        "primary": 4,
        "secondary": 3,
        "tertiary": 2,
        "residential": 1.2,
        "service": 1.0,
      }
    },
  },
}


@dataclasses.dataclass
class XyzProvider:
  name: str
  template: str
  min_zoom: int = 0
  max_zoom: int = 20


@dataclasses.dataclass
class StaticProvider:
  name: str
  build_url: Callable[[float, float, int, int, int], Optional[str]]


def clamp_lat(lat: float) -> float:
  return max(-85.05112878, min(85.05112878, lat))


def lon_to_tile_x(lon: float, zoom: int) -> float:
  n = 2 ** zoom
  return ((lon + 180.0) / 360.0) * n


def lat_to_tile_y(lat: float, zoom: int) -> float:
  n = 2 ** zoom
  lat_rad = math.radians(clamp_lat(lat))
  return ((1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0) * n


def wrap_x(x: int, n: int) -> int:
  return ((x % n) + n) % n


def fetch_image(url: str, session: requests.Session, timeout: float = 20.0) -> Optional[Image.Image]:
  try:
    resp = session.get(url, timeout=timeout)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")
  except Exception:
    return None


def load_dotenv(dotenv_path: Path) -> None:
  if not dotenv_path.exists():
    return
  for line in dotenv_path.read_text(encoding="utf-8").splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
      continue
    key, val = s.split("=", 1)
    key = key.strip()
    val = val.strip().strip('"').strip("'")
    if key and key not in os.environ:
      os.environ[key] = val


def render_xyz_provider(
  provider: XyzProvider,
  lat: float,
  lon: float,
  zoom: int,
  width: int,
  height: int,
  session: requests.Session,
) -> Optional[Image.Image]:
  if zoom < provider.min_zoom or zoom > provider.max_zoom:
    return None

  n = 2 ** zoom
  center_px_x = lon_to_tile_x(lon, zoom) * TILE_SIZE
  center_px_y = lat_to_tile_y(lat, zoom) * TILE_SIZE
  top_left_px_x = center_px_x - width / 2
  top_left_px_y = center_px_y - height / 2

  start_tile_x = math.floor(top_left_px_x / TILE_SIZE)
  start_tile_y = math.floor(top_left_px_y / TILE_SIZE)
  end_tile_x = math.floor((top_left_px_x + width - 1) / TILE_SIZE)
  end_tile_y = math.floor((top_left_px_y + height - 1) / TILE_SIZE)

  canvas = Image.new("RGB", (width, height), (238, 240, 243))

  jobs: List[Tuple[int, int, int, int, str]] = []
  for ty in range(start_tile_y, end_tile_y + 1):
    if ty < 0 or ty >= n:
      continue
    for tx in range(start_tile_x, end_tile_x + 1):
      wrapped_tx = wrap_x(tx, n)
      draw_x = int(round(tx * TILE_SIZE - top_left_px_x))
      draw_y = int(round(ty * TILE_SIZE - top_left_px_y))
      url = (
        provider.template.replace("{z}", str(zoom))
        .replace("{x}", str(wrapped_tx))
        .replace("{y}", str(ty))
        .replace("{r}", "")
      )
      jobs.append((draw_x, draw_y, wrapped_tx, ty, url))

  def _one(job: Tuple[int, int, int, int, str]) -> Tuple[int, int, Optional[Image.Image]]:
    draw_x, draw_y, _tx, _ty, url = job
    return draw_x, draw_y, fetch_image(url, session)

  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for draw_x, draw_y, tile in ex.map(_one, jobs):
      if tile is not None:
        canvas.paste(tile, (draw_x, draw_y))

  return canvas


def render_static_provider(
  provider: StaticProvider,
  lat: float,
  lon: float,
  zoom: int,
  width: int,
  height: int,
  session: requests.Session,
) -> Optional[Image.Image]:
  url = provider.build_url(lat, lon, zoom, width, height)
  if not url:
    return None
  return fetch_image(url, session)


def add_caption(img: Image.Image, title: str) -> Image.Image:
  font = ImageFont.load_default()
  cap_h = 42
  out = Image.new("RGB", (img.width, img.height + cap_h), (250, 250, 250))
  out.paste(img, (0, 0))
  draw = ImageDraw.Draw(out)
  draw.rectangle([0, img.height, img.width, img.height + cap_h], fill=(249, 249, 249))
  draw.text((12, img.height + 12), title, fill=(20, 20, 20), font=font)
  return out


def create_contact_sheet(items: List[Tuple[str, Path]], out_path: Path, thumb: int = 360, cols: int = 3) -> None:
  font = ImageFont.load_default()
  rows = math.ceil(len(items) / cols)
  cell_w = thumb + 24
  cell_h = thumb + 56
  sheet = Image.new("RGB", (cell_w * cols + 24, cell_h * rows + 24), (242, 244, 247))
  draw = ImageDraw.Draw(sheet)
  for i, (name, path) in enumerate(items):
    img = Image.open(path).convert("RGB")
    img = ImageOps.fit(img, (thumb, thumb), method=Image.Resampling.LANCZOS)
    r = i // cols
    c = i % cols
    x = 12 + c * cell_w + 12
    y = 12 + r * cell_h + 12
    sheet.paste(img, (x, y))
    draw.text((x, y + thumb + 10), name, fill=(25, 25, 25), font=font)
  sheet.save(out_path)


def prettymaps_worker(lat: float, lon: float, preset: str, radius: float, out_path: str, layer_override: Dict) -> None:
  import prettymaps  # type: ignore
  prettymaps.plot(
    (lat, lon),
    preset=preset,
    layers=layer_override,
    figsize=(8, 8),
    show=False,
    radius=radius,
    save_as=out_path,
  )


def generate_prettymaps_variants(
  city: str,
  lat: float,
  lon: float,
  out_dir: Path,
  max_presets: Optional[int] = None,
  timeout_sec: int = 180,
  radius: float = 700,
  preset_filter: Optional[List[str]] = None,
  layer_profile: str = "full",
) -> List[Tuple[str, Path]]:
  try:
    import prettymaps  # type: ignore
  except Exception:
    return []

  out_pretty = out_dir / "prettymaps"
  out_pretty.mkdir(parents=True, exist_ok=True)

  rows = prettymaps.presets()
  available = set(rows["preset"].tolist())
  readme_presets = [
    "minimal",
    "default",
    "barcelona",
    "cb-bf-f",
    "macao",
    "plotter",
    "tijuca",
    "heerhugowaard",
    "barcelona-plotter",
    "abraca-redencao",
  ]
  preset_names: List[str] = []
  if preset_filter:
    for p in preset_filter:
      p = p.strip()
      if p and p not in preset_names:
        preset_names.append(p)
  else:
    for p in readme_presets + sorted(available):
      if p not in preset_names:
        preset_names.append(p)
  if max_presets is not None:
    preset_names = preset_names[:max_presets]
  saved: List[Tuple[str, Path]] = []
  layer_override = PRETTYMAPS_LAYER_PROFILES.get(layer_profile, {})

  for preset in preset_names:
    if preset not in available:
      print(f"[prettymaps] {preset} ... unavailable in installed version")
      continue
    name = f"prettymaps_{preset}"
    out_path = out_pretty / f"{name}.png"
    try:
      print(f"[prettymaps] {preset} ... running (radius={radius}, timeout={timeout_sec}s, profile={layer_profile})")
      proc = mp.Process(target=prettymaps_worker, args=(lat, lon, preset, radius, str(out_path), layer_override))
      proc.start()
      proc.join(timeout=max(30, int(timeout_sec)))
      if proc.is_alive():
        proc.kill()
        proc.join()
        print(f"[prettymaps] {preset} ... timeout")
        continue
      if proc.exitcode != 0 or not out_path.exists():
        print(f"[prettymaps] {preset} ... failed")
        continue
      img = Image.open(out_path).convert("RGB")
      add_caption(img, name).save(out_path)
      saved.append((name, out_path))
      print(f"[prettymaps] {preset} ... ok")
    except Exception:
      print(f"[prettymaps] {preset} ... failed")
      continue

  if saved:
    create_contact_sheet(saved, out_pretty / "contact_sheet.png", thumb=320, cols=3)

  return saved


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--city", default="New York, USA")
  parser.add_argument("--lat", type=float, default=40.7128)
  parser.add_argument("--lon", type=float, default=-74.0060)
  parser.add_argument("--zoom", type=int, default=12)
  parser.add_argument("--width", type=int, default=1200)
  parser.add_argument("--height", type=int, default=1200)
  parser.add_argument("--out-dir", default="test-scripts/citymap-alternatives-ny")
  parser.add_argument("--dotenv", default="test-scripts/.env")
  parser.add_argument("--with-prettymaps", action="store_true")
  parser.add_argument("--only-prettymaps", action="store_true")
  parser.add_argument("--max-prettymaps-presets", type=int, default=0)
  parser.add_argument("--prettymaps-timeout-sec", type=int, default=180)
  parser.add_argument("--prettymaps-radius", type=float, default=700)
  parser.add_argument("--prettymaps-presets", default="")
  parser.add_argument("--prettymaps-layer-profile", choices=["full", "lite", "streets"], default="full")
  args = parser.parse_args()

  load_dotenv(Path(args.dotenv))

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)

  session = requests.Session()
  session.headers.update({"User-Agent": USER_AGENT})

  xyz_providers = [
    XyzProvider("osm_standard", "https://tile.openstreetmap.org/{z}/{x}/{y}.png", 0, 19),
    XyzProvider("carto_positron", "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", 0, 20),
    XyzProvider("carto_darkmatter", "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", 0, 20),
    XyzProvider("carto_voyager", "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", 0, 20),
    XyzProvider("open_topo_map", "https://tile.opentopomap.org/{z}/{x}/{y}.png", 0, 17),
    XyzProvider("cyclosm", "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png", 0, 20),
    XyzProvider("esri_world_street", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", 0, 19),
    XyzProvider("esri_light_gray", "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", 0, 19),
  ]

  def mapbox_url(style: str) -> Callable[[float, float, int, int, int], Optional[str]]:
    def _f(lat: float, lon: float, zoom: int, width: int, height: int) -> Optional[str]:
      token = os.getenv("MAPBOX_TOKEN", "").strip()
      if not token:
        return None
      return f"https://api.mapbox.com/styles/v1/{style}/static/{lon},{lat},{zoom},0/{width}x{height}?access_token={token}"
    return _f

  def maptiler_url(style: str) -> Callable[[float, float, int, int, int], Optional[str]]:
    def _f(lat: float, lon: float, zoom: int, width: int, height: int) -> Optional[str]:
      key = os.getenv("MAPTILER_API_KEY", "").strip()
      if not key:
        return None
      return f"https://api.maptiler.com/maps/{style}/static/{lon},{lat},{zoom}/{width}x{height}.png?key={key}"
    return _f

  def geoapify_url(style: str) -> Callable[[float, float, int, int, int], Optional[str]]:
    def _f(lat: float, lon: float, zoom: int, width: int, height: int) -> Optional[str]:
      key = os.getenv("GEOAPIFY_API_KEY", "").strip()
      if not key:
        return None
      return (
        f"https://maps.geoapify.com/v1/staticmap?style={style}&width={width}&height={height}"
        f"&center=lonlat:{lon},{lat}&zoom={zoom}&apiKey={key}"
      )
    return _f

  static_providers = [
    StaticProvider("mapbox_streets", mapbox_url("mapbox/streets-v12")),
    StaticProvider("mapbox_light", mapbox_url("mapbox/light-v11")),
    StaticProvider("mapbox_dark", mapbox_url("mapbox/dark-v11")),
    StaticProvider("maptiler_streets", maptiler_url("streets-v2")),
    StaticProvider("maptiler_backdrop", maptiler_url("backdrop")),
    StaticProvider("geoapify_osm_carto", geoapify_url("osm-carto")),
    StaticProvider("geoapify_dark_matter", geoapify_url("dark-matter-brown")),
  ]

  results: List[Dict[str, str]] = []
  saved_for_sheet: List[Tuple[str, Path]] = []

  print(f"[info] Generating city-map alternatives for {args.city} ({args.lat}, {args.lon})")

  if not args.only_prettymaps:
    for p in xyz_providers:
      print(f"[xyz] {p.name} ...", end="", flush=True)
      t0 = time.time()
      img = render_xyz_provider(
        p, args.lat, args.lon, args.zoom, args.width, args.height, session
      )
      if img is None:
        print(" skip")
        results.append({"provider": p.name, "status": "skipped"})
        continue
      out_path = out_dir / f"{p.name}.png"
      add_caption(img, p.name).save(out_path)
      print(f" ok ({time.time() - t0:.1f}s)")
      results.append({"provider": p.name, "status": "ok", "file": str(out_path)})
      saved_for_sheet.append((p.name, out_path))

    for p in static_providers:
      print(f"[static] {p.name} ...", end="", flush=True)
      t0 = time.time()
      img = render_static_provider(
        p, args.lat, args.lon, args.zoom, args.width, args.height, session
      )
      if img is None:
        print(" skip (no key or failed)")
        results.append({"provider": p.name, "status": "skipped"})
        continue
      out_path = out_dir / f"{p.name}.png"
      add_caption(img, p.name).save(out_path)
      print(f" ok ({time.time() - t0:.1f}s)")
      results.append({"provider": p.name, "status": "ok", "file": str(out_path)})
      saved_for_sheet.append((p.name, out_path))

  if args.with_prettymaps:
    pretty_saved = generate_prettymaps_variants(
      city=args.city,
      lat=args.lat,
      lon=args.lon,
      out_dir=out_dir,
      max_presets=(None if args.max_prettymaps_presets <= 0 else max(1, args.max_prettymaps_presets)),
      timeout_sec=max(30, args.prettymaps_timeout_sec),
      radius=max(100.0, args.prettymaps_radius),
      preset_filter=[x.strip() for x in args.prettymaps_presets.split(",") if x.strip()] or None,
      layer_profile=args.prettymaps_layer_profile,
    )
    for name, path in pretty_saved:
      results.append({"provider": name, "status": "ok", "file": str(path)})
      saved_for_sheet.append((name, path))

  if saved_for_sheet:
    contact_path = out_dir / "contact_sheet.png"
    create_contact_sheet(saved_for_sheet, contact_path, thumb=360, cols=3)
    print(f"[done] Contact sheet: {contact_path}")
  else:
    print("[warn] No images generated.")

  report = {
    "city": args.city,
    "lat": args.lat,
    "lon": args.lon,
    "zoom": args.zoom,
    "width": args.width,
    "height": args.height,
    "results": results,
  }
  report_path = out_dir / "report.json"
  report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
  print(f"[done] Report: {report_path}")


if __name__ == "__main__":
  main()
