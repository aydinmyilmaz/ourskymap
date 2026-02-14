#!/usr/bin/env python3
"""
Generate Geoapify style variants quickly for poster-style evaluation.

Examples:
  python3 test-scripts/generate_geoapify_styles.py
  python3 test-scripts/generate_geoapify_styles.py --city "New York, USA" --lat 40.7128 --lon -74.0060 --zoom 12
"""

from __future__ import annotations

import argparse
import json
import os
from io import BytesIO
from pathlib import Path
from typing import List, Tuple

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps


DEFAULT_STYLES = [
  "osm-carto",
  "osm-bright",
  "osm-bright-grey",
  "osm-bright-smooth",
  "klokantech-basic",
  "osm-liberty",
  "positron",
  "dark-matter-brown",
]


def load_dotenv(path: Path) -> None:
  if not path.exists():
    return
  for line in path.read_text(encoding="utf-8").splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
      continue
    k, v = s.split("=", 1)
    k = k.strip()
    v = v.strip().strip('"').strip("'")
    if k and k not in os.environ:
      os.environ[k] = v


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
  if not items:
    return
  font = ImageFont.load_default()
  rows = (len(items) + cols - 1) // cols
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


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--city", default="New York, USA")
  parser.add_argument("--lat", type=float, default=40.7128)
  parser.add_argument("--lon", type=float, default=-74.0060)
  parser.add_argument("--zoom", type=int, default=12)
  parser.add_argument("--width", type=int, default=1200)
  parser.add_argument("--height", type=int, default=1200)
  parser.add_argument("--styles", default=",".join(DEFAULT_STYLES))
  parser.add_argument("--dotenv", default="test-scripts/.env")
  parser.add_argument("--out-dir", default="test-scripts/geoapify-styles-ny")
  args = parser.parse_args()

  load_dotenv(Path(args.dotenv))
  api_key = os.getenv("GEOAPIFY_API_KEY", "").strip()
  if not api_key:
    raise SystemExit("GEOAPIFY_API_KEY not found. Put it in test-scripts/.env")

  out_dir = Path(args.out_dir)
  out_dir.mkdir(parents=True, exist_ok=True)

  styles = [s.strip() for s in args.styles.split(",") if s.strip()]
  session = requests.Session()
  session.headers.update({"User-Agent": "space-map-geoapify-tests/1.0"})

  results = []
  saved = []
  for style in styles:
    print(f"[geoapify] {style} ...", end="", flush=True)
    url = (
      "https://maps.geoapify.com/v1/staticmap"
      f"?style={style}"
      f"&width={args.width}"
      f"&height={args.height}"
      f"&center=lonlat:{args.lon},{args.lat}"
      f"&zoom={args.zoom}"
      f"&apiKey={api_key}"
    )
    try:
      r = session.get(url, timeout=30)
      if r.status_code != 200:
        print(f" skip ({r.status_code})")
        results.append({"style": style, "status": "skipped", "status_code": r.status_code})
        continue

      img = Image.open(BytesIO(r.content)).convert("RGB")
      out_path = out_dir / f"{style}.png"
      add_caption(img, style).save(out_path)
      print(" ok")
      results.append({"style": style, "status": "ok", "file": str(out_path)})
      saved.append((style, out_path))
    except Exception as e:
      print(" failed")
      results.append({"style": style, "status": "failed", "error": str(e)})

  if saved:
    create_contact_sheet(saved, out_dir / "contact_sheet.png")
    print(f"[done] Contact sheet: {out_dir / 'contact_sheet.png'}")

  report = {
    "city": args.city,
    "lat": args.lat,
    "lon": args.lon,
    "zoom": args.zoom,
    "styles": styles,
    "results": results,
  }
  report_path = out_dir / "report.json"
  report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
  print(f"[done] Report: {report_path}")


if __name__ == "__main__":
  main()
