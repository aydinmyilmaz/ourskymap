#!/usr/bin/env python3
"""
Age number mosaic PoC for "tile-like" seamless placement.

Goal:
- Fill a number mask (e.g. 70, 66) with photos.
- Reduce visible seams without blur.
- Support strict grid and adaptive rectangle packing.

Example:
  python3 test-scripts/test_kolaj.py \
    --photos-dir age_test_images_2 \
    --age 70 \
    --size 1440x1152 \
    --output yas_kutlama_70_poc.png \
    --layout adaptive-pack \
    --fit cover \
    --base-tile 54 \
    --gap 0 \
    --bleed 2 \
    --supersample 2
"""

from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Sequence, Tuple

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

try:
    import cv2
except Exception:
    cv2 = None


VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


@dataclass(frozen=True)
class Rect:
    x: int
    y: int
    w: int
    h: int


@dataclass
class Config:
    photos_dir: Path
    age_text: str
    output_path: Path
    width: int
    height: int
    layout: str
    fit: str
    base_tile: int
    gap: int
    bleed: int
    supersample: int
    bg: str
    text_color: str
    font_path: str | None
    seed: int
    max_images: int
    min_coverage: float
    smart_crop: bool
    debug_tiles: bool
    save_mask: bool


def parse_size(raw: str) -> Tuple[int, int]:
    s = raw.lower().strip()
    if "x" not in s:
        raise ValueError(f"Invalid size '{raw}', expected WIDTHxHEIGHT")
    w_s, h_s = s.split("x", 1)
    w, h = int(w_s), int(h_s)
    if w < 256 or h < 256:
        raise ValueError("Size too small, minimum is 256x256")
    return w, h


def parse_args() -> Config:
    parser = argparse.ArgumentParser(description="Age number mosaic PoC")
    parser.add_argument("--photos-dir", required=True, help="Folder containing photos")
    parser.add_argument("--age", default="70", help="Number text")
    parser.add_argument("--output", default="yas_kutlama_poc.png", help="Output image path")
    parser.add_argument("--size", default="1440x1152", help="Canvas size, e.g. 1440x1152")
    parser.add_argument("--layout", choices=["strict-grid", "adaptive-pack"], default="adaptive-pack")
    parser.add_argument("--fit", choices=["cover", "contain", "stretch"], default="cover")
    parser.add_argument("--base-tile", type=int, default=54, help="Base tile size in pixels")
    parser.add_argument("--gap", type=int, default=0, help="Gap between tiles")
    parser.add_argument("--bleed", type=int, default=2, help="Tile overlap in pixels to hide seams")
    parser.add_argument("--supersample", type=int, default=2, help="Render multiplier (1..4)")
    parser.add_argument("--bg", default="#ffffff", help="Background color")
    parser.add_argument("--text-color", default="#111111", help="Number/text color")
    parser.add_argument("--font-path", default=None, help="Optional .ttf/.otf font path")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--max-images", type=int, default=200, help="Max images to read")
    parser.add_argument(
        "--min-coverage",
        type=float,
        default=0.72,
        help="Minimum mask coverage ratio for each tile (0.2..1.0)",
    )
    parser.add_argument("--smart-crop", action="store_true", default=True, help="Use face/saliency-aware centering for cover crop")
    parser.add_argument("--no-smart-crop", action="store_true", help="Disable smart crop")
    parser.add_argument("--debug-tiles", action="store_true", help="Draw tile boundaries")
    parser.add_argument("--save-mask", action="store_true", help="Also save mask image")
    args = parser.parse_args()

    width, height = parse_size(args.size)
    return Config(
        photos_dir=Path(args.photos_dir).expanduser().resolve(),
        age_text=str(args.age).strip() or "70",
        output_path=Path(args.output).expanduser().resolve(),
        width=width,
        height=height,
        layout=args.layout,
        fit=args.fit,
        base_tile=max(8, int(args.base_tile)),
        gap=max(0, int(args.gap)),
        bleed=max(0, int(args.bleed)),
        supersample=max(1, min(4, int(args.supersample))),
        bg=args.bg.strip(),
        text_color=args.text_color.strip(),
        font_path=args.font_path,
        seed=int(args.seed),
        max_images=max(1, int(args.max_images)),
        min_coverage=max(0.2, min(1.0, float(args.min_coverage))),
        smart_crop=(not bool(args.no_smart_crop)) and bool(args.smart_crop),
        debug_tiles=bool(args.debug_tiles),
        save_mask=bool(args.save_mask),
    )


def discover_images(folder: Path, max_images: int) -> List[Path]:
    if not folder.exists():
        raise FileNotFoundError(f"Photos dir does not exist: {folder}")
    paths = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in VALID_EXTS]
    paths.sort()
    return paths[:max_images]


def pick_font(font_path: str | None, font_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if font_path:
        candidates.append(Path(font_path))
    candidates.extend(
        [
            Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            Path("/System/Library/Fonts/Supplemental/Helvetica.ttc"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ]
    )
    for c in candidates:
        if c.exists():
            try:
                return ImageFont.truetype(str(c), font_size)
            except OSError:
                pass
    return ImageFont.load_default()


def make_number_mask(cfg: Config, width: int, height: int) -> Image.Image:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    font_size = int(height * 0.70)
    font = pick_font(cfg.font_path, font_size)
    bbox = draw.textbbox((0, 0), cfg.age_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (width - text_w) // 2
    y = (height - text_h) // 2 - int(height * 0.06)
    draw.text((x, y), cfg.age_text, font=font, fill=255)
    return mask


def mask_bbox(mask_arr: np.ndarray) -> Tuple[int, int, int, int]:
    ys, xs = np.where(mask_arr > 0)
    if len(xs) == 0:
        raise ValueError("Mask is empty")
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return x0, y0, x1, y1


def rect_inside_mask(mask_arr: np.ndarray, rect: Rect, min_coverage: float) -> bool:
    h, w = mask_arr.shape[:2]
    x0 = max(0, rect.x)
    y0 = max(0, rect.y)
    x1 = min(w, rect.x + rect.w)
    y1 = min(h, rect.y + rect.h)
    if x1 <= x0 or y1 <= y0:
        return False
    area = (x1 - x0) * (y1 - y0)
    region = mask_arr[y0:y1, x0:x1]
    coverage = float(np.count_nonzero(region)) / float(area)
    return coverage >= min_coverage


def build_strict_grid(mask_arr: np.ndarray, base_tile: int, gap: int, min_coverage: float) -> List[Rect]:
    x0, y0, x1, y1 = mask_bbox(mask_arr)
    step = max(1, base_tile + gap)
    tiles: List[Rect] = []
    for y in range(y0 - step, y1 + step, step):
        for x in range(x0 - step, x1 + step, step):
            rect = Rect(x=x, y=y, w=base_tile, h=base_tile)
            if rect_inside_mask(mask_arr, rect, min_coverage):
                tiles.append(rect)
    return tiles


def build_adaptive_pack(mask_arr: np.ndarray, base_tile: int, gap: int, min_coverage: float) -> List[Rect]:
    x0, y0, x1, y1 = mask_bbox(mask_arr)
    step = max(1, base_tile + gap)
    grid_w = max(1, math.ceil((x1 - x0 + 1) / step) + 2)
    grid_h = max(1, math.ceil((y1 - y0 + 1) / step) + 2)
    occ = np.zeros((grid_h, grid_w), dtype=np.uint8)
    tiles: List[Rect] = []

    # Larger candidates first. Units are in base tiles.
    candidates: Sequence[Tuple[int, int]] = (
        (3, 2),
        (2, 3),
        (2, 2),
        (3, 1),
        (1, 3),
        (2, 1),
        (1, 2),
        (1, 1),
    )

    def can_place(gx: int, gy: int, tw: int, th: int) -> bool:
        if gx + tw > grid_w or gy + th > grid_h:
            return False
        if np.any(occ[gy : gy + th, gx : gx + tw] != 0):
            return False
        px = x0 + gx * step
        py = y0 + gy * step
        rect = Rect(px, py, tw * base_tile + (tw - 1) * gap, th * base_tile + (th - 1) * gap)
        return rect_inside_mask(mask_arr, rect, min_coverage)

    for gy in range(grid_h):
        for gx in range(grid_w):
            if occ[gy, gx] != 0:
                continue
            placed = False
            for tw, th in candidates:
                if can_place(gx, gy, tw, th):
                    occ[gy : gy + th, gx : gx + tw] = 1
                    px = x0 + gx * step
                    py = y0 + gy * step
                    rect = Rect(px, py, tw * base_tile + (tw - 1) * gap, th * base_tile + (th - 1) * gap)
                    tiles.append(rect)
                    placed = True
                    break
            if not placed:
                # Mark unusable cell to avoid repeated checks.
                occ[gy, gx] = 2

    return tiles


_FACE_CASCADE = None


def get_face_cascade():
    global _FACE_CASCADE
    if cv2 is None:
        return None
    if _FACE_CASCADE is not None:
        return _FACE_CASCADE
    try:
        cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        if cascade_path.exists():
            c = cv2.CascadeClassifier(str(cascade_path))
            if not c.empty():
                _FACE_CASCADE = c
                return _FACE_CASCADE
    except Exception:
        pass
    _FACE_CASCADE = None
    return None


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, float(v)))


def estimate_focus_point(photo: Image.Image) -> Tuple[float, float]:
    """
    Return centering tuple in [0,1]x[0,1] for ImageOps.fit.
    Priority:
    1) Face center (if detected)
    2) Saliency centroid from gradients
    3) Center fallback
    """
    w, h = photo.size
    if w < 2 or h < 2:
        return (0.5, 0.5)

    arr = np.array(photo.convert("RGB"))

    if cv2 is not None:
        try:
            gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        except Exception:
            gray = None
    else:
        gray = None

    # 1) Face-aware crop center
    if gray is not None:
        cascade = get_face_cascade()
        if cascade is not None:
            try:
                min_face = max(20, min(w, h) // 10)
                faces = cascade.detectMultiScale(gray, scaleFactor=1.12, minNeighbors=4, minSize=(min_face, min_face))
                if len(faces) > 0:
                    weights = []
                    centers_x = []
                    centers_y = []
                    for (fx, fy, fw, fh) in faces:
                        area = float(fw * fh)
                        centers_x.append((fx + fw * 0.5) / max(1.0, float(w)))
                        centers_y.append((fy + fh * 0.45) / max(1.0, float(h)))
                        weights.append(area)
                    ws = np.array(weights, dtype=np.float64)
                    xs = np.array(centers_x, dtype=np.float64)
                    ys = np.array(centers_y, dtype=np.float64)
                    cx = float((xs * ws).sum() / max(1e-9, ws.sum()))
                    cy = float((ys * ws).sum() / max(1e-9, ws.sum()))
                    # Small center blend to avoid aggressive edge crops.
                    return (clamp01(0.8 * cx + 0.2 * 0.5), clamp01(0.8 * cy + 0.2 * 0.5))
            except Exception:
                pass

    # 2) Saliency-ish center from gradient energy
    if gray is not None:
        try:
            gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
            energy = cv2.GaussianBlur(cv2.magnitude(gx, gy), (0, 0), 1.2)
            energy = np.maximum(energy, 0.0)
            s = float(energy.sum())
            if s > 1e-6:
                yy, xx = np.indices(energy.shape)
                cx = float((energy * xx).sum() / s) / max(1.0, float(w - 1))
                cy = float((energy * yy).sum() / s) / max(1.0, float(h - 1))
                return (clamp01(0.7 * cx + 0.3 * 0.5), clamp01(0.7 * cy + 0.3 * 0.5))
        except Exception:
            pass

    return (0.5, 0.5)


def fit_image_to_rect(photo: Image.Image, w: int, h: int, fit: str, bg: str, centering: Tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    if fit == "stretch":
        return photo.resize((w, h), Image.Resampling.LANCZOS)

    if fit == "cover":
        return ImageOps.fit(photo, (w, h), method=Image.Resampling.LANCZOS, centering=(clamp01(centering[0]), clamp01(centering[1])))

    # contain (no crop): bars can appear. Fill bars with average color (not blur).
    canvas = Image.new("RGB", (w, h), bg)
    src = photo.copy()
    src.thumbnail((w, h), Image.Resampling.LANCZOS)
    px = (w - src.width) // 2
    py = (h - src.height) // 2
    canvas.paste(src, (px, py))
    return canvas


def load_and_shuffle(paths: Sequence[Path], seed: int) -> List[Path]:
    items = list(paths)
    rnd = random.Random(seed)
    rnd.shuffle(items)
    return items


def compose_mosaic(cfg: Config) -> None:
    print("\n=== Age Mosaic PoC ===")
    print(f"photos: {cfg.photos_dir}")
    print(f"age: {cfg.age_text}")
    print(f"layout: {cfg.layout} | fit: {cfg.fit}")
    print(f"smart_crop: {cfg.smart_crop}")
    print(f"base_tile: {cfg.base_tile} gap: {cfg.gap} bleed: {cfg.bleed} supersample: {cfg.supersample}")

    photo_paths = discover_images(cfg.photos_dir, cfg.max_images)
    if not photo_paths:
        raise RuntimeError(f"No images found in {cfg.photos_dir}")
    photo_paths = load_and_shuffle(photo_paths, cfg.seed)
    print(f"loaded photos: {len(photo_paths)}")

    # Supersample render to suppress seams on downscale.
    W = cfg.width * cfg.supersample
    H = cfg.height * cfg.supersample
    tile = cfg.base_tile * cfg.supersample
    gap = cfg.gap * cfg.supersample
    bleed = cfg.bleed * cfg.supersample

    mask = make_number_mask(cfg, W, H)
    mask_arr = np.array(mask, dtype=np.uint8)
    if cfg.save_mask:
        mask_out = cfg.output_path.with_name(cfg.output_path.stem + "_mask.png")
        mask.save(mask_out)
        print(f"saved mask: {mask_out}")

    if cfg.layout == "strict-grid":
        tiles = build_strict_grid(mask_arr, tile, gap, cfg.min_coverage)
    else:
        tiles = build_adaptive_pack(mask_arr, tile, gap, cfg.min_coverage)
        # Fallback if adaptive is too sparse for a given mask/font combo.
        if len(tiles) < 8:
            tiles = build_strict_grid(mask_arr, tile, gap, cfg.min_coverage)
            print("adaptive-pack too sparse, fallback -> strict-grid")

    if not tiles:
        raise RuntimeError("No tiles produced inside mask")
    print(f"tiles: {len(tiles)}")

    # Preload images once and cache smart-crop focus.
    photo_bank: List[Tuple[Image.Image, Tuple[float, float], str]] = []
    for p in photo_paths:
        try:
            with Image.open(p) as im:
                rgb = im.convert("RGB")
            focus = estimate_focus_point(rgb) if cfg.smart_crop and cfg.fit == "cover" else (0.5, 0.5)
            photo_bank.append((rgb, focus, p.name))
        except Exception:
            continue
    if not photo_bank:
        raise RuntimeError("No valid images were loaded from photos dir")

    # Background canvas and tile layer.
    base = Image.new("RGB", (W, H), cfg.bg)
    tile_layer = Image.new("RGB", (W, H), cfg.bg)
    draw_debug = ImageDraw.Draw(tile_layer) if cfg.debug_tiles else None

    pasted = 0
    for i, rect in enumerate(tiles):
        photo, focus, _name = photo_bank[i % len(photo_bank)]

        tw = max(1, rect.w + bleed * 2)
        th = max(1, rect.h + bleed * 2)
        fitted = fit_image_to_rect(photo, tw, th, cfg.fit, cfg.bg, centering=focus)

        # Integer coordinates only.
        x = rect.x - bleed
        y = rect.y - bleed
        tile_layer.paste(fitted, (x, y))
        pasted += 1

        if draw_debug:
            draw_debug.rectangle((rect.x, rect.y, rect.x + rect.w - 1, rect.y + rect.h - 1), outline=cfg.text_color, width=max(1, cfg.supersample))

    if pasted == 0:
        raise RuntimeError("No photo tiles were pasted (check image formats/paths)")

    # Keep tiles only where number mask is present.
    mask_rgb = Image.merge("RGB", (mask, mask, mask))
    clipped = ImageChops.multiply(tile_layer, mask_rgb)

    # Build alpha for compositing over plain background.
    alpha = mask.point(lambda px: 255 if px > 0 else 0)
    base.paste(clipped, (0, 0), alpha)

    # Add a thin edge only (stroke), not full fill.
    expanded = mask.filter(ImageFilter.MaxFilter(3))
    edge = ImageChops.subtract(expanded, mask)
    edge_overlay = Image.new("RGB", (W, H), cfg.text_color)
    base.paste(edge_overlay, (0, 0), edge)

    if cfg.supersample > 1:
        base = base.resize((cfg.width, cfg.height), Image.Resampling.LANCZOS)

    cfg.output_path.parent.mkdir(parents=True, exist_ok=True)
    base.save(cfg.output_path, quality=95)
    print(f"saved: {cfg.output_path}")


def main() -> None:
    cfg = parse_args()
    compose_mosaic(cfg)


if __name__ == "__main__":
    main()
