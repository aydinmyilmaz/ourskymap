#!/usr/bin/env python3
"""
Generate and benchmark prettymaps presets only.

Examples:
  python3 test-scripts/generate_prettymaps_only.py --city "New York, USA" --presets minimal,default --radius 1500
  python3 test-scripts/generate_prettymaps_only.py --lat 40.7128 --lon -74.0060 --presets minimal --radius 3000 --profile streets
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont, ImageOps


PRESET_ORDER = [
  "minimal",
  "default",
  "barcelona",
  "cb-bf-f",
  "macao",
  "tijuca",
  "heerhugowaard",
  "barcelona-plotter",
  "abraca-redencao",
  "plotter",
]

LAYER_PROFILES: Dict[str, Dict] = {
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


def add_caption(img: Image.Image, title: str) -> Image.Image:
  font = ImageFont.load_default()
  cap_h = 42
  out = Image.new("RGB", (img.width, img.height + cap_h), (250, 250, 250))
  out.paste(img, (0, 0))
  draw = ImageDraw.Draw(out)
  draw.rectangle([0, img.height, img.width, img.height + cap_h], fill=(249, 249, 249))
  draw.text((12, img.height + 12), title, fill=(20, 20, 20), font=font)
  return out


def create_contact_sheet(items: List[Tuple[str, Path]], out_path: Path, thumb: int = 320, cols: int = 3) -> None:
  if not items:
    return
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


def parse_presets(raw: str) -> List[str]:
  if not raw.strip():
    return []
  return [x.strip() for x in raw.split(",") if x.strip()]


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--city", default="New York, USA")
  parser.add_argument("--lat", type=float, default=40.7128)
  parser.add_argument("--lon", type=float, default=-74.0060)
  parser.add_argument("--use-city-query", action="store_true")
  parser.add_argument("--radius", type=float, default=1500.0)
  parser.add_argument("--figsize", type=float, default=8.0)
  parser.add_argument("--presets", default="minimal,default,barcelona,cb-bf-f")
  parser.add_argument("--profile", choices=["full", "lite", "streets"], default="streets")
  parser.add_argument("--out-dir", default="test-scripts/prettymaps-only-ny")
  parser.add_argument("--cache-dir", default="cache/prettymaps")
  parser.add_argument("--repeat", type=int, default=1)
  args = parser.parse_args()

  import osmnx as ox  # imported here so script remains standalone
  import prettymaps

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)

  # Keep cache persistent between runs. This is the main speed win.
  ox.settings.use_cache = True
  ox.settings.cache_folder = args.cache_dir
  ox.settings.timeout = max(120, int(getattr(ox.settings, "timeout", 180)))

  query = args.city if args.use_city_query else (args.lat, args.lon)
  all_available = set(prettymaps.presets()["preset"].tolist())

  requested = parse_presets(args.presets)
  if not requested:
    requested = PRESET_ORDER.copy()
  ordered_presets: List[str] = []
  for p in requested:
    if p not in ordered_presets:
      ordered_presets.append(p)

  layer_override = LAYER_PROFILES.get(args.profile, {})

  results = []
  saved = []
  print(f"[info] query={query} radius={args.radius} profile={args.profile} repeat={args.repeat}")

  for preset in ordered_presets:
    if preset not in all_available:
      print(f"[prettymaps] {preset} ... unavailable")
      results.append({"preset": preset, "status": "unavailable"})
      continue

    for run_idx in range(args.repeat):
      t0 = time.time()
      name = f"{preset}_r{int(args.radius)}_run{run_idx + 1}"
      out_raw = out_dir / f"{name}.png"
      try:
        print(f"[prettymaps] {preset} run {run_idx + 1}/{args.repeat} ...", end="", flush=True)
        prettymaps.plot(
          query,
          preset=preset,
          layers=layer_override,
          radius=args.radius,
          figsize=(args.figsize, args.figsize),
          show=False,
          save_as=str(out_raw),
        )
        dt = time.time() - t0
        img = Image.open(out_raw).convert("RGB")
        add_caption(img, f"{preset} | r={int(args.radius)} | {dt:.1f}s").save(out_raw)
        print(f" ok ({dt:.1f}s)")
        results.append({"preset": preset, "run": run_idx + 1, "status": "ok", "seconds": round(dt, 3), "file": str(out_raw)})
        saved.append((name, out_raw))
      except Exception as e:
        dt = time.time() - t0
        print(f" failed ({dt:.1f}s)")
        results.append({"preset": preset, "run": run_idx + 1, "status": "failed", "seconds": round(dt, 3), "error": str(e)})

  if saved:
    create_contact_sheet(saved, out_dir / "contact_sheet.png")
    print(f"[done] Contact sheet: {out_dir / 'contact_sheet.png'}")

  report = {
    "query": args.city if args.use_city_query else {"lat": args.lat, "lon": args.lon},
    "radius": args.radius,
    "profile": args.profile,
    "repeat": args.repeat,
    "results": results,
  }
  report_path = out_dir / "report.json"
  report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
  print(f"[done] Report: {report_path}")


if __name__ == "__main__":
  main()
