from skyfield.api import load, wgs84, Star
from skyfield.data import hipparcos, stellarium
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.patches import Circle
import numpy as np
import matplotlib.patheffects as path_effects
import json
import io
from datetime import datetime, timezone
import argparse
import os
import tomllib

SKYCULTURE_WESTERN_URL = (
    'https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/master/western/index.json'
)

_RESOURCES = None


def _to_utc_datetime(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_time_utc(value: str) -> datetime:
    v = (value or '').strip()
    if v.lower() == 'now':
        return datetime.now(timezone.utc)
    # Accept ISO 8601 with optional trailing Z.
    if v.endswith('Z'):
        v = v[:-1] + '+00:00'
    return datetime.fromisoformat(v).astimezone(timezone.utc)


def _load_config(path: str) -> dict:
    with open(path, 'rb') as f:
        return tomllib.load(f)


def _get_render_options(config: dict) -> dict:
    render = dict(config.get('render', {}) or {})
    return {
        'theme': render.get('theme', 'light'),
        'show_azimuth_scale': bool(render.get('show_azimuth_scale', True)),
        'label_constellations': bool(render.get('label_constellations', True)),
        'label_bright_stars': bool(render.get('label_bright_stars', False)),
        'star_mode': render.get('star_mode', 'all'),
        'magnitude_limit': float(render.get('magnitude_limit', 6.5)),
        'min_star_size': float(render.get('min_star_size', 1.2)),
        'star_size_min': float(render.get('star_size_min', 0.96)),
        'star_size_max': float(render.get('star_size_max', 12.0)),
        'star_size_gamma': float(render.get('star_size_gamma', 1.25)),
        'star_alpha': float(render.get('star_alpha', 1.0)),
        'emphasize_constellation_vertices': bool(render.get('emphasize_constellation_vertices', False)),
        'vertex_size_min': float(render.get('vertex_size_min', 1.0)),
        'vertex_size_max': float(render.get('vertex_size_max', 18.0)),
        'vertex_size_gamma': float(render.get('vertex_size_gamma', 1.5)),
        'vertex_alpha': float(render.get('vertex_alpha', 0.9)),
        'constellation_line_width': float(render.get('constellation_line_width', 0.66)),
        'constellation_line_alpha': float(render.get('constellation_line_alpha', 0.66)),
        'ecliptic_alpha': float(render.get('ecliptic_alpha', 0.45)),
        'location_name': render.get('location_name', 'Unspecified'),
    }


def _get_charts(config: dict) -> list[dict]:
    charts = config.get('charts', [])
    if not isinstance(charts, list):
        raise ValueError('config: "charts" must be a list')
    return charts


def _load_resources():
    ts = load.timescale()
    eph = load('de421.bsp')

    with load.open(hipparcos.URL) as f:
        stars_df = hipparcos.load_dataframe(f)
    required_cols = [
        'ra_degrees',
        'dec_degrees',
        'parallax_mas',
        'ra_mas_per_year',
        'dec_mas_per_year',
    ]
    stars_df = stars_df.dropna(subset=required_cols)

    with load.open(SKYCULTURE_WESTERN_URL) as f:
        western = json.load(io.TextIOWrapper(f, encoding='utf-8'))

    constellation_edges = []
    constellation_hips = set()
    constellations = []
    for constellation in western.get('constellations', []):
        hip_set = set()
        for polyline in constellation.get('lines', []):
            for a, b in zip(polyline, polyline[1:]):
                try:
                    ai = int(a)
                    bi = int(b)
                except (TypeError, ValueError):
                    continue
                constellation_edges.append((ai, bi))
                constellation_hips.add(ai)
                constellation_hips.add(bi)
                hip_set.add(ai)
                hip_set.add(bi)
        if hip_set:
            common_name = constellation.get('common_name', {}) or {}
            label = common_name.get('english') or constellation.get('iau') or constellation.get('id') or 'UNK'
            constellations.append({'label': label, 'hips': sorted(hip_set)})

    return {
        'ts': ts,
        'eph': eph,
        'stars_df': stars_df,
        'constellation_edges': constellation_edges,
        'constellation_hips': sorted(constellation_hips),
        'constellations': constellations,
    }


def _get_resources():
    global _RESOURCES
    if _RESOURCES is None:
        _RESOURCES = _load_resources()
    return _RESOURCES


def _altaz_to_xy(alt_deg: np.ndarray, az_deg: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    # Heavens-Above style polar projection (zenith in center, horizon at r=1):
    # r is normalized zenith distance; theta is azimuth from North, clockwise.
    r = (90.0 - alt_deg) / 90.0
    theta = np.radians(az_deg)
    x = r * np.sin(theta)
    y = r * np.cos(theta)
    return x, y


def _segments_from_polyline(x: np.ndarray, y: np.ndarray) -> list[list[tuple[float, float]]]:
    segments: list[list[tuple[float, float]]] = []
    for i in range(len(x) - 1):
        segments.append([(float(x[i]), float(y[i])), (float(x[i + 1]), float(y[i + 1]))])
    return segments


def _draw_sun(ax, x: float, y: float, r: float = 0.03):
    core = Circle((x, y), r, facecolor='white', edgecolor='black', linewidth=1.0, zorder=7)
    ax.add_patch(core)
    for a in np.linspace(0, 2 * np.pi, 12, endpoint=False):
        x1 = x + (r + 0.01) * np.cos(a)
        y1 = y + (r + 0.01) * np.sin(a)
        x2 = x + (r + 0.03) * np.cos(a)
        y2 = y + (r + 0.03) * np.sin(a)
        ax.plot([x1, x2], [y1, y2], color='black', linewidth=0.8, zorder=7)


def _draw_moon(ax, x: float, y: float, r: float = 0.028, phase_offset: float = 0.012):
    # Simple crescent: black disk with a slightly offset white disk on top.
    dark = Circle((x, y), r, facecolor='black', edgecolor='black', linewidth=0.8, zorder=7)
    cut = Circle((x + phase_offset, y), r, facecolor='white', edgecolor='none', zorder=8)
    ax.add_patch(dark)
    ax.add_patch(cut)


def _draw_azimuth_scale(ax, r_inner: float = 1.0, r_outer: float = 1.08):
    # Outer ring and degree labels like the sample image.
    ax.add_patch(Circle((0, 0), r_inner, fill=False, edgecolor='black', linewidth=1.2, zorder=10))
    ax.add_patch(Circle((0, 0), r_outer, fill=False, edgecolor='black', linewidth=0.8, zorder=10))

    for az in range(0, 360, 10):
        ang = np.radians(az)
        x1 = r_inner * np.sin(ang)
        y1 = r_inner * np.cos(ang)
        tick = 0.012 if az % 30 else 0.02
        x2 = (r_inner + tick) * np.sin(ang)
        y2 = (r_inner + tick) * np.cos(ang)
        ax.plot([x1, x2], [y1, y2], color='black', linewidth=0.6, zorder=10)

        if az % 10 == 0:
            tx = (r_outer - 0.02) * np.sin(ang)
            ty = (r_outer - 0.02) * np.cos(ang)
            # Rotate text tangentially for readability similar to the sample.
            rot = -az
            ax.text(
                tx,
                ty,
                f'{az}',
                fontsize=7,
                ha='center',
                va='center',
                rotation=rot,
                rotation_mode='anchor',
                color='black',
                zorder=11,
            )

    # Cardinal directions
    card = [('N', 0), ('E', 90), ('S', 180), ('W', 270)]
    for label, az in card:
        ang = np.radians(az)
        tx = (r_outer + 0.035) * np.sin(ang)
        ty = (r_outer + 0.035) * np.cos(ang)
        ax.text(tx, ty, label, fontsize=14, weight='bold', ha='center', va='center', color='black', zorder=12)


def _star_sizes_from_magnitude(
    mags: np.ndarray,
    mag_limit: float,
    s_min: float,
    s_max: float,
    gamma: float = 1.6,
) -> np.ndarray:
    """
    Map magnitude -> scatter size (points^2) with a tight dynamic range to avoid
    big "bubble" stars (poster-friendly).
    """
    mags = mags.astype(float)
    # Brighter => larger, but compressed.
    x = np.clip((mag_limit - mags) / max(mag_limit, 1e-6), 0.0, 1.0)
    x = x**gamma
    return s_min + (s_max - s_min) * x


def create_sky_chart(
    latitude: float,
    longitude: float,
    time_utc: datetime,
    output_file: str = 'sky_chart.pdf',
    magnitude_limit: float = 6.5,
    star_mode: str = 'all',  # 'none' | 'constellations' | 'all'
    label_constellations: bool = True,
    label_bright_stars: bool = False,
    show_azimuth_scale: bool = True,
    theme: str = 'light',  # 'light' | 'dark'
    location_name: str = 'Unspecified',
    emphasize_constellation_vertices: bool = False,
    min_star_size: float = 1.2,
    star_size_min: float = 0.96,
    star_size_max: float = 12.0,
    star_size_gamma: float = 1.25,
    star_alpha: float = 1.0,
    vertex_size_min: float = 1.0,
    vertex_size_max: float = 18.0,
    vertex_size_gamma: float = 1.5,
    vertex_alpha: float = 0.9,
    constellation_line_width: float = 0.66,
    constellation_line_alpha: float = 0.66,
    ecliptic_alpha: float = 0.45,
):
    """
    Herhangi bir konum ve zaman için (UTC) azimuthal/polar gökyüzü haritası üretir.
    - Merkez: zenit
    - Dış çember: ufuk
    - Açı: azimut (Kuzeyden saat yönünde)
    """
    resources = _get_resources()
    ts = resources['ts']
    eph = resources['eph']
    stars_df = resources['stars_df']
    constellation_edges = resources['constellation_edges']
    constellation_hips = resources['constellation_hips']
    constellations = resources['constellations']

    dt_utc = _to_utc_datetime(time_utc)
    t = ts.from_datetime(dt_utc)
    location = wgs84.latlon(latitude, longitude)
    observer = eph['earth'] + location

    # Constellation lines: compute coordinates once for each HIP referenced.
    constellation_lines = []
    subset_df = stars_df.loc[stars_df.index.intersection(constellation_hips)]
    hip_to_xy = {}
    if len(subset_df) > 0:
        line_positions = observer.at(t).observe(Star.from_dataframe(subset_df))
        l_alt, l_az, _ = line_positions.apparent().altaz()
        l_visible = l_alt.degrees > 0
        l_x, l_y = _altaz_to_xy(l_alt.degrees[l_visible], l_az.degrees[l_visible])
        visible_hips = subset_df.index.values[l_visible]
        hip_to_xy = {int(hip): (float(x), float(y)) for hip, x, y in zip(visible_hips, l_x, l_y)}

        for a, b in constellation_edges:
            p1 = hip_to_xy.get(a)
            p2 = hip_to_xy.get(b)
            if p1 is not None and p2 is not None:
                constellation_lines.append([p1, p2])

    # Stars (three modes)
    star_x = np.array([], dtype=float)
    star_y = np.array([], dtype=float)
    star_mags = np.array([], dtype=float)
    if star_mode == 'all':
        bright_stars = stars_df[stars_df['magnitude'] <= magnitude_limit].copy()
        star_positions = observer.at(t).observe(Star.from_dataframe(bright_stars))
        alt, az, _ = star_positions.apparent().altaz()
        visible_mask = alt.degrees > 0
        star_x, star_y = _altaz_to_xy(alt.degrees[visible_mask], az.degrees[visible_mask])
        star_mags = bright_stars['magnitude'].values.astype(float)[visible_mask]
    elif star_mode == 'constellations':
        if hip_to_xy:
            hips = np.fromiter(hip_to_xy.keys(), dtype=int)
            mags = stars_df.loc[hips, 'magnitude'].values.astype(float)
            keep = mags <= magnitude_limit
            hips = hips[keep]
            mags = mags[keep]
            star_mags = mags
            coords = [hip_to_xy[int(h)] for h in hips]
            if coords:
                star_x = np.array([c[0] for c in coords], dtype=float)
                star_y = np.array([c[1] for c in coords], dtype=float)
    elif star_mode == 'none':
        pass
    else:
        raise ValueError("star_mode must be one of: 'none', 'constellations', 'all'")

    # Planets
    planet_data = []
    planets_info = [
        ('sun', 'Sun', '#000000'),
        ('moon', 'Moon', '#000000'),
        ('mercury', 'Mercury', '#888888'),
        ('venus', 'Venus', '#FDB813'),
        ('mars', 'Mars', '#CD5C5C'),
        ('jupiter barycenter', 'Jupiter', '#DAA520'),
        ('saturn barycenter', 'Saturn', '#F4A460'),
    ]
    for planet_name, label, color in planets_info:
        try:
            planet = eph[planet_name]
            planet_pos = observer.at(t).observe(planet)
            p_alt, p_az, _ = planet_pos.apparent().altaz()
            if p_alt.degrees > 0:
                px, py = _altaz_to_xy(
                    np.array([p_alt.degrees], dtype=float),
                    np.array([p_az.degrees], dtype=float),
                )
                planet_data.append((float(px[0]), float(py[0]), label, color))
        except Exception:
            continue

    # Ecliptic (approximate; J2000 obliquity is sufficient for a chart)
    epsilon = np.radians(23.439291)
    ecl_lon = np.radians(np.arange(0.0, 360.0 + 2.0, 2.0))
    x_ecl = np.cos(ecl_lon)
    y_ecl = np.sin(ecl_lon)
    z_ecl = np.zeros_like(x_ecl)
    x_eq = x_ecl
    y_eq = y_ecl * np.cos(epsilon) - z_ecl * np.sin(epsilon)
    z_eq = y_ecl * np.sin(epsilon) + z_ecl * np.cos(epsilon)
    ra = (np.degrees(np.arctan2(y_eq, x_eq)) % 360.0) / 15.0
    dec = np.degrees(np.arcsin(z_eq))
    ecl_star = Star(ra_hours=ra, dec_degrees=dec)
    ecl_pos = observer.at(t).observe(ecl_star)
    ecl_alt, ecl_az, _ = ecl_pos.apparent().altaz()
    ecl_vis = ecl_alt.degrees > 0
    ecl_x, ecl_y = _altaz_to_xy(ecl_alt.degrees[ecl_vis], ecl_az.degrees[ecl_vis])

    # Constellation labels: place at mean of visible line-star coords.
    constellation_labels = []
    if label_constellations and constellation_lines:
        for c in constellations:
            pts = []
            for hip in c['hips']:
                p = hip_to_xy.get(int(hip))
                if p is not None:
                    pts.append(p)
            if pts:
                mx = float(sum(p[0] for p in pts) / len(pts))
                my = float(sum(p[1] for p in pts) / len(pts))
                # Avoid labels too close to horizon edge
                if mx * mx + my * my < 0.95 * 0.95:
                    constellation_labels.append((mx, my, str(c['label'])))

    # Figure: Heavens-Above-like dark theme (A4 portrait)
    if theme == 'dark':
        fig_face = 'black'
        ax_face = 'black'
        star_color = 'white'
        line_color = '#bfbfbf'
        label_color = '#dddddd'
        text_stroke = 'black'
        ecl_color = '#999999'
    elif theme == 'light':
        fig_face = 'white'
        ax_face = 'white'
        star_color = '#111111'
        # Keep lines subtle so the star field reads first.
        line_color = '#9a9a9a'
        label_color = '#666666'
        text_stroke = 'white'
        ecl_color = '#999999'
    else:
        raise ValueError("theme must be 'light' or 'dark'")

    fig, ax = plt.subplots(figsize=(8.27, 11.69), facecolor=fig_face)
    ax.set_facecolor(ax_face)
    ax.set_position([0.05, 0.13, 0.90, 0.80])

    if show_azimuth_scale and theme == 'light':
        _draw_azimuth_scale(ax, r_inner=1.0, r_outer=1.08)
    else:
        # Horizon only (subtle)
        horizon = Circle((0, 0), 1.0, fill=False, edgecolor='#666666', linewidth=1.0, alpha=0.6)
        ax.add_patch(horizon)

    # Constellation lines
    if constellation_lines:
        lines = LineCollection(
            constellation_lines,
            colors=line_color,
            linewidths=float(constellation_line_width),
            alpha=float(constellation_line_alpha),
            zorder=2,
        )
        ax.add_collection(lines)

    # Stars
    if len(star_x) > 0:
        # Poster-friendly: tiny points with limited size range.
        sizes = _star_sizes_from_magnitude(
            star_mags,
            mag_limit=magnitude_limit,
            s_min=star_size_min,
            s_max=star_size_max,
            gamma=star_size_gamma,
        )
        # Drop very small stars to reduce visual clutter.
        keep = sizes >= float(min_star_size)
        ax.scatter(
            star_x[keep],
            star_y[keep],
            s=sizes[keep],
            c=star_color,
            alpha=max(0.0, min(1.0, float(star_alpha))),
            edgecolors='none',
            zorder=3,
        )

    # Emphasize constellation vertices (bigger dots like the sample)
    if emphasize_constellation_vertices and hip_to_xy:
        hips = np.array(list(hip_to_xy.keys()), dtype=int)
        mags = stars_df.loc[hips, 'magnitude'].values.astype(float)
        keep = mags <= max(magnitude_limit, 6.5)
        hips = hips[keep]
        mags = mags[keep]
        coords = [hip_to_xy[int(h)] for h in hips]
        if coords:
            vx = np.array([c[0] for c in coords], dtype=float)
            vy = np.array([c[1] for c in coords], dtype=float)
            vs = _star_sizes_from_magnitude(
                mags,
                mag_limit=max(magnitude_limit, 6.5),
                s_min=float(vertex_size_min),
                s_max=float(vertex_size_max),
                gamma=float(vertex_size_gamma),
            )
            ax.scatter(
                vx,
                vy,
                s=vs,
                c=star_color,
                alpha=max(0.0, min(1.0, float(vertex_alpha))),
                edgecolors='none',
                zorder=4,
            )

    # Bright star labels
    famous_stars = {
        'Polaris': 11767,
        'Achernar': 7588,
        'Aldebaran': 21421,
        'Capella': 24608,
        'Canopus': 30438,
        'Arcturus': 69673,
        'Vega': 91262,
        'Altair': 97649,
        'Deneb': 102098,
        'Fomalhaut': 113368,
        'Antares': 80763,
        'Rigel': 24436,
        'Betelgeuse': 27989,
        'Sirius': 32349,
        'Procyon': 37279,
        'Spica': 65474,
        'Regulus': 49669,
    }
    if label_bright_stars:
        hip_list = [hip for hip in famous_stars.values() if hip in stars_df.index]
        if hip_list:
            fs_df = stars_df.loc[hip_list]
            fs_pos = observer.at(t).observe(Star.from_dataframe(fs_df))
            fs_alt, fs_az, _ = fs_pos.apparent().altaz()
            fs_vis = fs_alt.degrees > 0
            fs_x, fs_y = _altaz_to_xy(fs_alt.degrees[fs_vis], fs_az.degrees[fs_vis])
            fs_hips = fs_df.index.values[fs_vis]
            hip_to_fsxy = {int(h): (float(x), float(y)) for h, x, y in zip(fs_hips, fs_x, fs_y)}
            for star_name, hip in famous_stars.items():
                p = hip_to_fsxy.get(int(hip))
                if p is not None:
                    x, y = p
                    txt = ax.text(x, y + 0.018, star_name, fontsize=6, ha='center', color=label_color, weight='normal')
                    txt.set_path_effects([path_effects.withStroke(linewidth=2, foreground=text_stroke)])

    # Planets
    for px, py, label, color in planet_data:
        if theme == 'light':
            if label == 'Sun':
                _draw_sun(ax, px, py, r=0.028)
            elif label == 'Moon':
                _draw_moon(ax, px, py, r=0.026, phase_offset=0.012)
            else:
                ax.scatter(px, py, s=45, c='black', marker='o', edgecolors='black', linewidths=0.5, zorder=6)
        else:
            ax.scatter(px, py, s=55, c='white', marker='o', edgecolors='white', linewidths=0.5, zorder=6)

        txt = ax.text(px, py + 0.03, label, fontsize=7, ha='center', weight='normal', color=label_color)
        txt.set_path_effects([path_effects.withStroke(linewidth=2, foreground=text_stroke)])

    # Ecliptic line (dashed)
    if len(ecl_x) > 2:
        ecl_segments = _segments_from_polyline(ecl_x, ecl_y)
        ecl = LineCollection(
            ecl_segments,
            colors=ecl_color,
            linewidths=1.0,
            alpha=float(ecliptic_alpha),
            linestyles=(0, (4, 4)),
            zorder=1,
        )
        ax.add_collection(ecl)

    # Constellation labels (subtle)
    for x, y, label in constellation_labels:
        txt = ax.text(x, y, label, fontsize=8, ha='center', va='center', color=label_color, alpha=0.9)
        txt.set_path_effects([path_effects.withStroke(linewidth=2, foreground=text_stroke)])

    # Title
    lat_str = f"{abs(latitude):.4f}°{'N' if latitude >= 0 else 'S'}"
    lon_str = f"{abs(longitude):.4f}°{'E' if longitude >= 0 else 'W'}"
    time_str = dt_utc.strftime('%d %B %Y %H:%M')
    info1 = f"Location: {location_name}, {lat_str}, {lon_str}"
    info2 = f"Time: {time_str} (UTC +00:00)"
    fig.text(0.08, 0.06, info1, fontsize=10, ha='left', va='center', color=('black' if theme == 'light' else '#cccccc'))
    fig.text(0.08, 0.035, info2, fontsize=10, ha='left', va='center', color=('black' if theme == 'light' else '#cccccc'))

    ax.set_xlim(-1.15, 1.15)
    ax.set_ylim(-1.15, 1.15)
    ax.set_aspect('equal')
    ax.axis('off')

    # Save full page (avoid tight-cropping like bbox_inches='tight')
    plt.savefig(output_file, dpi=300, format='pdf', backend='pdf', facecolor=fig.get_facecolor())
    if output_file.lower().endswith('.pdf'):
        svg_file = output_file[:-4] + '.svg'
    else:
        svg_file = output_file + '.svg'
    plt.savefig(svg_file, format='svg', facecolor=fig.get_facecolor())
    plt.close(fig)

    print(f"✅ Tamamlandı: {output_file} (+ {svg_file})")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--config',
        default=os.environ.get('SKY_CHART_CONFIG', 'sky_chart_config.toml'),
        help='Path to TOML config (default: sky_chart_config.toml or $SKY_CHART_CONFIG).',
    )
    args = parser.parse_args()

    config = _load_config(args.config)
    render_opts = _get_render_options(config)
    charts = _get_charts(config)
    if not charts:
        raise SystemExit('No charts configured. Add [[charts]] entries to the config.')

    for chart in charts:
        create_sky_chart(
            latitude=float(chart['latitude']),
            longitude=float(chart['longitude']),
            time_utc=_parse_time_utc(str(chart['time_utc'])),
            output_file=str(chart.get('output_file', 'sky_chart.pdf')),
            magnitude_limit=render_opts['magnitude_limit'],
            star_mode=render_opts['star_mode'],
            label_constellations=render_opts['label_constellations'],
            label_bright_stars=render_opts['label_bright_stars'],
            show_azimuth_scale=render_opts['show_azimuth_scale'],
            theme=render_opts['theme'],
            location_name=render_opts['location_name'],
            emphasize_constellation_vertices=render_opts['emphasize_constellation_vertices'],
            min_star_size=render_opts['min_star_size'],
            star_size_min=render_opts['star_size_min'],
            star_size_max=render_opts['star_size_max'],
            star_size_gamma=render_opts['star_size_gamma'],
            star_alpha=render_opts['star_alpha'],
            vertex_size_min=render_opts['vertex_size_min'],
            vertex_size_max=render_opts['vertex_size_max'],
            vertex_size_gamma=render_opts['vertex_size_gamma'],
            vertex_alpha=render_opts['vertex_alpha'],
            constellation_line_width=render_opts['constellation_line_width'],
            constellation_line_alpha=render_opts['constellation_line_alpha'],
            ecliptic_alpha=render_opts['ecliptic_alpha'],
        )
