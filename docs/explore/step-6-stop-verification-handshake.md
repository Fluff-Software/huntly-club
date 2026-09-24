# Huntly World Explore — Step 6: Stop Verification Handshake

**Date:** 2026-07-23  
**Depends on:** Steps 1–5  
**Scope:** Proximity verification only — **no claims saved, no cards awarded**

---

## Verification endpoint

`POST /explore/stops/verify` on the local Explore server (`http://localhost:4310`).

### Request

```json
{
  "stop_id": "stop_example",
  "generation_version": 2,
  "reported_location": {
    "latitude": 53.0442,
    "longitude": -2.1656,
    "accuracy_metres": 18
  }
}
```

The server **ignores** any client-supplied stop latitude/longitude.

### Thresholds (starting values)

| Setting | Value |
| --- | --- |
| `claimRadiusMetres` | **50** |
| `maximumAcceptedAccuracyMetres` | **75** |

Defined in `scripts/explore/server/verify-stop.ts`.

### Authoritative stop lookup

1. Load prepared local OSM extract (`fixtures/local/stoke-sneyd-green.geojson`)  
2. Run / reuse disposable in-memory generator cache for `generation_version`  
3. Find accepted stop by `stop_id`  
4. Use **generator** stop coordinates for distance  

Overpass is **not** called. Nothing is written to Supabase.

### Success (claimable)

```json
{
  "valid": true,
  "claimable": true,
  "stop": { "stop_id": "…", "latitude": …, "longitude": …, "…" : "…" },
  "verification": {
    "distance_metres": 37.4,
    "claim_radius_metres": 50,
    "reported_accuracy_metres": 18,
    "maximum_accuracy_metres": 75
  }
}
```

### Error codes

| Code | Meaning |
| --- | --- |
| `invalid_request` | Malformed / oversized body |
| `invalid_stop_id` | Missing/empty stop id |
| `invalid_location` | Bad lat/lng |
| `invalid_accuracy` | Missing/non-positive accuracy |
| `unsupported_generation_version` | Version not supported |
| `stop_not_found` | ID not in generated set |
| `too_far_away` | Distance &gt; claim radius |
| `gps_accuracy_too_low` | Accuracy &gt; max accepted |
| `generator_unavailable` | OSM extract missing |

`valid: false` ⇒ stop/request invalid.  
`valid: true, claimable: false` ⇒ stop exists but proximity/accuracy failed.

---

## Mobile service

`verifyExploreStop({ stopId, generationVersion, latitude, longitude, accuracyMetres })` in `apps/mobile/services/exploreStopsService.ts`.

Types in `apps/mobile/types/exploreStops.ts` (`ExploreVerifyRequest`, `ExploreVerifyResponse`, …).

App sends only ID + version + reported location/accuracy.

---

## Debug UI

On Explore debug selected-stop panel:

- **Verify proximity** (disabled while loading)  
- Label: *DEV verification only — no claim or reward is saved*  
- Shows claimable, backend distance, radii, accuracy, error  

### Simulator / DEV location controls (`__DEV__` only)

| Control | Behaviour |
| --- | --- |
| Device GPS | Fresh foreground fix |
| Sim 10 m | Report ~10 m from selected stop |
| Sim 100 m | Report ~100 m from selected stop |
| Sim poor GPS | Near stop but accuracy 100 m |

Simulated coordinates are labelled in UI; backend treats them like any report.

---

## How to run

```bash
cd scripts/explore
npm test
npm run generate
npm run serve
```

Manual:

```bash
curl -s -X POST http://localhost:4310/explore/stops/verify \
  -H 'Content-Type: application/json' \
  -d '{"stop_id":"<id>","generation_version":2,"reported_location":{"latitude":…,"longitude":…,"accuracy_metres":15}}'
```

Mobile: set `EXPO_PUBLIC_EXPLORE_API_URL`, open Explore debug, select stop, choose sim mode, Verify.

---

## Security boundaries

- Client stop coordinates are not trusted  
- Distance is computed only on the backend  
- Client-generated IDs only work if they match generated set  
- No claim persistence  
- Simulation controls exist only on the `__DEV__` debug screen  

---

## Known limitations

- Single test area / generation version  
- Cold generator cache still slow on first verify  
- Accuracy is self-reported (spoofable until device attestation / future hardening)  
- Not a full claim transaction  

## Recommended Step 7

Persist a **claim attempt / claim record** after successful verify (still no weighted cards), with idempotency on `(user, stop_id, generation_version)` and server-side re-verify at claim time.

---

## Confirmations

- No claims are saved  
- No cards are awarded  
- Generated stops are not stored in Supabase  
- Client stop coordinates are not trusted  
- Distance is calculated by the backend  
- Overpass is not called during verification  
