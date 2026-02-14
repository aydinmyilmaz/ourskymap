#!/usr/bin/env python3
"""
Generate a minimal vector-style city poster (road hierarchy + water + marker).

Example:
  python3 test-scripts/generate_minimal_vector_poster.py --place "Madrid, Spain" --radius 9000
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path
from typing import Dict, Iterable, Tuple

import geopandas as gpd
import matplotlib.pyplot as plt
import osmnx as ox
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pyproj import Transformer
from shapely.geometry import box


def slugify(s: str) -> str:
  return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def pick_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
  candidates = []
  if bold:
    candidates += [
      "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
      "/Library/Fonts/Arial Bold.ttf",
    ]
  candidates += [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica.ttf",
  ]
  for path in candidates:
    p = Path(path)
    if p.exists():
      try:
        return ImageFont.truetype(str(p), size=size)
      except Exception:
        pass
  return ImageFont.load_default()


def normalize_highway(v) -> str:
  if isinstance(v, (list, tuple)) and v:
    v = v[0]
  if not isinstance(v, str):
    return ""
  return v.lower().replace("_link", "")


def subset_by_highway(edges: gpd.GeoDataFrame, kinds: Iterable[str]) -> gpd.GeoDataFrame:
  kinds = set(kinds)
  return edges[edges["highway_norm"].isin(kinds)]


def draw_vector_map(
  place: str,
  lat: float,
  lon: float,
  radius_m: float,
  map_out: Path,
  network_type: str = "drive_service",
) -> Dict:
  timings: Dict[str, float] = {}
  t0 = time.time()

  ox.settings.use_cache = True
  ox.settings.cache_folder = "cache/osmnx"
  ox.settings.log_console = False
  ox.settings.timeout = 180

  # Road graph
  t = time.time()
  G = ox.graph_from_point((lat, lon), dist=radius_m, network_type=network_type, simplify=True)
  Gp = ox.projection.project_graph(G)
  _, edges = ox.graph_to_gdfs(Gp, nodes=True, edges=True)
  edges = edges.copy()
  edges["highway_norm"] = edges["highway"].apply(normalize_highway)
  timings["roads_fetch_project_s"] = round(time.time() - t, 3)

  crs = edges.crs
  transformer = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
  cx, cy = transformer.transform(lon, lat)
  boundary = box(cx - radius_m, cy - radius_m, cx + radius_m, cy + radius_m)
  edges = edges.clip(boundary)

  # Water features (optional but useful for this style)
  water_poly = gpd.GeoDataFrame(geometry=[], crs=crs)
  t = time.time()
  try:
    water_tags = {"natural": ["water", "bay"], "water": ["lake", "reservoir"]}
    water = ox.geometries_from_point((lat, lon), tags=water_tags, dist=radius_m)
    if len(water):
      water = water.to_crs(crs)
      water = water.clip(boundary)
      water_poly = water[water.geometry.geom_type.isin(["Polygon", "MultiPolygon"])][["geometry"]]
  except Exception:
    pass
  timings["water_fetch_s"] = round(time.time() - t, 3)

  # Plot map
  t = time.time()
  fig, ax = plt.subplots(figsize=(8, 8), dpi=320)
  ax.set_facecolor("#f7f7f7")
  fig.patch.set_facecolor("#f7f7f7")

  if len(water_poly):
    water_poly.plot(ax=ax, color="#d6dde2", edgecolor="none", alpha=0.95, zorder=1)

  road_styles = [
    (["service", "unclassified", "residential", "living_street"], 0.45, "#c8c8c8", 0.95, 2),
    (["tertiary"], 0.75, "#a4a4a4", 0.95, 3),
    (["secondary"], 1.1, "#6f6f6f", 0.96, 4),
    (["primary"], 1.8, "#3e3e3e", 0.97, 5),
    (["trunk", "motorway"], 2.6, "#1d1d1d", 0.98, 6),
  ]
  for kinds, lw, color, alpha, z in road_styles:
    s = subset_by_highway(edges, kinds)
    if len(s):
      s.plot(ax=ax, linewidth=lw, color=color, alpha=alpha, zorder=z)

  # Red marker
  ax.scatter([cx], [cy], s=150, c="#e11d2e", edgecolors="white", linewidths=1.6, zorder=20)

  ax.set_xlim(cx - radius_m, cx + radius_m)
  ax.set_ylim(cy - radius_m, cy + radius_m)
  ax.set_aspect("equal")
  ax.axis("off")
  fig.savefig(map_out, dpi=320, bbox_inches="tight", pad_inches=0)
  plt.close(fig)
  timings["map_draw_s"] = round(time.time() - t, 3)

  timings["total_s"] = round(time.time() - t0, 3)
  return timings


def compose_poster(
  map_path: Path,
  out_path: Path,
  title: str,
  country: str,
  lat: float,
  lon: float,
) -> None:
  W, H = 2400, 3600
  margin = 120
  map_top = 180
  map_size = W - (margin * 2)

  poster = Image.new("RGB", (W, H), "#fdfdfd")
  draw = ImageDraw.Draw(poster)

  # Outer subtle frame
  draw.rectangle([30, 30, W - 30, H - 30], outline="#d7d7d7", width=4)

  # Map
  map_img = Image.open(map_path).convert("RGB")
  map_img = ImageOps.fit(map_img, (map_size, map_size), method=Image.Resampling.LANCZOS)
  poster.paste(map_img, (margin, map_top))

  # Text
  y = map_top + map_size + 70
  title_f = pick_font(108, bold=True)
  country_f = pick_font(56, bold=False)
  meta_f = pick_font(42, bold=False)

  draw.text((W / 2, y), title.upper(), fill="#111111", font=title_f, anchor="ma")
  draw.text((W / 2, y + 95), country, fill="#333333", font=country_f, anchor="ma")
  coord = f"{abs(lat):.4f}° {'N' if lat >= 0 else 'S'}, {abs(lon):.4f}° {'E' if lon >= 0 else 'W'}"
  draw.text((W / 2, y + 165), coord, fill="#5f5f5f", font=meta_f, anchor="ma")

  # Inner border like classic posters
  draw.rectangle([margin - 8, map_top - 8, margin + map_size + 8, H - margin], outline="#8f8f8f", width=2)

  poster.save(out_path)


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--place", default="Madrid, Spain")
  parser.add_argument("--lat", type=float, default=None)
  parser.add_argument("--lon", type=float, default=None)
  parser.add_argument("--radius", type=float, default=9000)
  parser.add_argument("--network-type", default="drive_service")
  parser.add_argument("--out-dir", default="test-scripts/minimal-vector-tests")
  args = parser.parse_args()

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)

  if args.lat is None or args.lon is None:
    lat, lon = ox.geocode(args.place)
  else:
    lat, lon = args.lat, args.lon

  slug = slugify(args.place)
  map_out = out_dir / f"{slug}_map.png"
  poster_out = out_dir / f"{slug}_poster.png"

  timings = draw_vector_map(
    place=args.place,
    lat=lat,
    lon=lon,
    radius_m=args.radius,
    map_out=map_out,
    network_type=args.network_type,
  )

  parts = [p.strip() for p in args.place.split(",") if p.strip()]
  city = parts[0] if parts else "City"
  country = parts[-1] if len(parts) > 1 else ""
  compose_poster(map_out, poster_out, city, country, lat, lon)

  report = {
    "place": args.place,
    "lat": lat,
    "lon": lon,
    "radius_m": args.radius,
    "network_type": args.network_type,
    "map_output": str(map_out),
    "poster_output": str(poster_out),
    "timings": timings,
  }
  report_path = out_dir / f"{slug}_report.json"
  report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

  print(f"[done] map: {map_out}")
  print(f"[done] poster: {poster_out}")
  print(f"[done] report: {report_path}")
  print(f"[timing] total={timings['total_s']}s roads={timings['roads_fetch_project_s']}s water={timings['water_fetch_s']}s draw={timings['map_draw_s']}s")


if __name__ == "__main__":
  main()
