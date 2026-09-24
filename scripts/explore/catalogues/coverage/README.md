# Coverage polygons for `uk-and-ireland`

Final accepted Explore points must fall inside approved administrative coverage
for the **United Kingdom** and the **Republic of Ireland**.

## Include

- England, Scotland, Wales, Northern Ireland (UK)
- Republic of Ireland
- Inhabited offshore islands that are part of those administrations
  (e.g. Isle of Wight, Anglesey, Hebrides, Orkney, Shetland, Irish coastal islands)

## Exclude

- **Isle of Man** (Crown Dependency — not UK / not ROI)
- **Channel Islands** (Jersey / Guernsey bailiwicks — not UK / not ROI)
- Any other territory outside UK or ROI admin polygons

## File

`uk-and-ireland.geojson` will hold the MultiPolygon used for point-in-polygon
filtering after chunk generation.

**Status (Step 10.4 Phase A):** polygon file not yet materialised. Acquisition
options for Phase B:

1. Extract `admin_level=2` boundaries for `United Kingdom` and `Ireland` from
   the same Geofabrik PBF via osmium (preferred — same revision as points).
2. Or load an authoritative boundary GeoJSON pinned by revision hash.

Until the polygon exists, preflight and generate must refuse a full national run
(`--confirm-full-run`).

The Geofabrik extract envelope (approx bbox in `uk-and-ireland.json`) is **not**
the inclusion rule — it only describes the source extract extent.
