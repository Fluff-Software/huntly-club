# Explore stop-generator fixtures

## Committed (safe)

| File | Purpose |
| --- | --- |
| `test-area.geojson` | Small synthetic OSM-like FeatureCollection for unit tests |
| `local/.gitkeep` | Keeps the local extract directory in git |

## Local / ignored (do not commit)

| File | Purpose |
| --- | --- |
| `local/stoke-sneyd-green.geojson` | Small Overpass extract (Mornington Road / Sneyd Green) |
| `local/stoke-on-trent.geojson` | Full-city Overpass extract for catalogue generation |

Create with:

```bash
npm run prepare:osm                              # Sneyd Green
npm run prepare:osm -- --region stoke-on-trent   # full city (tiled)
```

## Licence

Real extracts: **ODbL** — © OpenStreetMap contributors  
https://www.openstreetmap.org/copyright
