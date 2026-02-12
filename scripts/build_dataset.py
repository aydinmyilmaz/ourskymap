import json
import pathlib

from skyfield.api import load
from skyfield.data import hipparcos

SKYCULTURE_WESTERN_URL = (
    'https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/master/western/index.json'
)

OUT_DIR = pathlib.Path('data')
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    # Load Hipparcos dataframe (pandas required; already in venv).
    with load.open(hipparcos.URL) as f:
        stars_df = hipparcos.load_dataframe(f)

    required_cols = [
        'ra_degrees',
        'dec_degrees',
        'magnitude',
        'parallax_mas',
        'ra_mas_per_year',
        'dec_mas_per_year',
    ]
    stars_df = stars_df.dropna(subset=required_cols)

    # Load Stellarium skyculture JSON and gather constellation HIP ids.
    with load.open(SKYCULTURE_WESTERN_URL) as f:
        western = json.load(f)

    constellation_edges = []
    constellation_hips = set()
    constellations = []

    for c in western.get('constellations', []):
        hip_set = set()
        edges = []
        for polyline in c.get('lines', []):
            for a, b in zip(polyline, polyline[1:]):
                try:
                    ai = int(a)
                    bi = int(b)
                except (TypeError, ValueError):
                    continue
                edges.append([ai, bi])
                hip_set.add(ai)
                hip_set.add(bi)
        if not hip_set:
            continue

        common_name = c.get('common_name', {}) or {}
        label = common_name.get('english') or c.get('iau') or c.get('id') or 'UNK'
        constellations.append({'label': label, 'hips': sorted(hip_set)})
        constellation_edges.extend(edges)
        constellation_hips.update(hip_set)

    # Export a trimmed star catalog: mag<=6.5 plus all constellation hips.
    MAG_LIMIT = 6.5
    bright = stars_df[stars_df['magnitude'] <= MAG_LIMIT]
    needed_hips = set(bright.index.astype(int).tolist()) | set(map(int, constellation_hips))
    subset = stars_df.loc[sorted(set(stars_df.index.astype(int)).intersection(needed_hips))]

    stars = []
    for hip, row in subset.iterrows():
        stars.append(
            {
                'hip': int(hip),
                'ra_deg': float(row['ra_degrees']),
                'dec_deg': float(row['dec_degrees']),
                'mag': float(row['magnitude']),
            }
        )

    (OUT_DIR / 'stars.json').write_text(json.dumps(stars, separators=(',', ':')))
    (OUT_DIR / 'constellations.json').write_text(
        json.dumps(
            {
                'edges': constellation_edges,
                'constellations': constellations,
            },
            separators=(',', ':'),
        )
    )

    # Also write a small metadata file.
    (OUT_DIR / 'meta.json').write_text(
        json.dumps(
            {
                'mag_limit': MAG_LIMIT,
                'stars_count': len(stars),
                'edges_count': len(constellation_edges),
                'constellations_count': len(constellations),
            },
            indent=2,
        )
    )

    print('Wrote:', OUT_DIR / 'stars.json')
    print('Wrote:', OUT_DIR / 'constellations.json')
    print('Wrote:', OUT_DIR / 'meta.json')


if __name__ == '__main__':
    main()
