/**
 * Self-contained Leaflet HTML map for remote safety review (Step 4).
 */
import type { FeatureCollection } from "geojson";
import type { GenerationSummary } from "./types.js";

function embedJson(name: string, value: unknown): string {
  return `window.${name} = ${JSON.stringify(value).replace(/</g, "\\u003c")};`;
}

export function buildReviewMapHtml(opts: {
  accepted: FeatureCollection;
  rejected: FeatureCollection;
  reviewSample: FeatureCollection;
  summary: GenerationSummary;
  areaLabel: string;
}): string {
  const { accepted, rejected, reviewSample, summary, areaLabel } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Huntly Explore — remote stop review</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body { margin: 0; height: 100%; font-family: system-ui, sans-serif; }
    #map { position: absolute; inset: 0 0 0 360px; background: #dce6dc; }
    #sidebar {
      position: absolute; left: 0; top: 0; bottom: 0; width: 360px;
      overflow: auto; background: #1b2a22; color: #f4f0eb; padding: 14px;
      box-sizing: border-box; font-size: 12px; line-height: 1.4;
    }
    h1 { font-size: 15px; margin: 0 0 6px; }
    h2 { font-size: 12px; margin: 14px 0 6px; color: #b7d4c0; }
    .muted { color: #a8b5ad; }
    label.filter { display:block; margin: 3px 0; cursor: pointer; }
    #error { display:none; background:#7a1f1f; color:#fff; padding:8px; border-radius:8px; margin-bottom:10px; }
    .stop-list { list-style:none; padding:0; margin:0; }
    .stop-list li {
      padding:7px 8px; margin:0 0 5px; background:#2a4033; border-radius:8px; cursor:pointer;
    }
    .stop-list li:hover, .stop-list li.active { background:#3d5f45; }
    .pin { width:22px; height:22px; border-radius:50%; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.55); }
    .pin-accepted { background:#1f9d55; }
    .pin-low { background:#f08c00; }
    .pin-water { background:#1c7ed6; }
    .pin-school { background:#ae3ec9; }
    .pin-barrier { background:#e8590c; }
    .pin-edge { background:#868e96; }
    .pin-sample { background:#f0b429; }
    .pin-rejected { background:#c92a2a; width:12px; height:12px; border-width:2px; }
    pre { white-space: pre-wrap; font-size: 11px; }
    a { color:#9fd0ff; }
  </style>
</head>
<body>
  <aside id="sidebar">
    <h1>Explore remote review</h1>
    <div id="error"></div>
    <p class="muted">${areaLabel.replace(/</g, "")}</p>
    <p class="muted">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · open in a normal browser</p>
    <h2>Summary</h2>
    <div id="summary"></div>
    <h2>Accepted filters</h2>
    <label class="filter"><input type="checkbox" data-acc="all" checked> All accepted</label>
    <label class="filter"><input type="checkbox" data-acc="low" checked> Low confidence</label>
    <label class="filter"><input type="checkbox" data-acc="water" checked> Near water</label>
    <label class="filter"><input type="checkbox" data-acc="school" checked> Near school</label>
    <label class="filter"><input type="checkbox" data-acc="barrier" checked> Near barrier</label>
    <label class="filter"><input type="checkbox" data-acc="edge" checked> Near bbox edge</label>
    <label class="filter"><input type="checkbox" data-acc="sample" checked> Review sample</label>
    <h2>Rejected filters</h2>
    <label class="filter"><input type="checkbox" data-rej="enable"> Show rejected</label>
    <label class="filter"><input type="checkbox" data-rej="water"> Water</label>
    <label class="filter"><input type="checkbox" data-rej="trunk"> Trunk / major road</label>
    <label class="filter"><input type="checkbox" data-rej="barrier"> Barrier / school</label>
    <label class="filter"><input type="checkbox" data-rej="edge"> Bbox edge</label>
    <label class="filter"><input type="checkbox" data-rej="other"> Other (excl. spacing / outside)</label>
    <p class="muted">outside_test_area &amp; too_close_to_existing_stop stay hidden.</p>
    <h2>Accepted stops</h2>
    <ul id="stop-list" class="stop-list"></ul>
    <h2>Selected</h2>
    <div id="detail" class="muted">Click a pin or list item.</div>
  </aside>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    ${embedJson("__ACCEPTED__", accepted)}
    ${embedJson("__REJECTED__", rejected)}
    ${embedJson("__SAMPLE__", reviewSample)}
    ${embedJson("__SUMMARY__", summary)}
  </script>
  <script>
  (function () {
    const errorEl = document.getElementById('error');
    function showError(msg) { errorEl.style.display='block'; errorEl.textContent=msg; }
    if (typeof L === 'undefined') {
      showError('Leaflet failed to load. Open in Chrome/Safari/Firefox with network access.');
      return;
    }
    const s = window.__SUMMARY__;
    document.getElementById('summary').innerHTML = [
      ['Accepted', s.acceptedCount],
      ['Low confidence', s.acceptedLowConfidence],
      ['Near water', s.acceptedNearWater],
      ['Near school', s.acceptedNearSchool],
      ['Near barrier', s.acceptedNearBarrier],
      ['Near bbox edge', s.acceptedNearBboxEdge],
      ['Review sample', s.reviewSampleSize],
      ['Rejected attempts', s.rejectedPositionAttempts],
    ].map(([k,v]) => '<div><strong>'+k+':</strong> '+v+'</div>').join('');

    const map = L.map('map');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const detail = document.getElementById('detail');
    function showProps(props, kind) {
      const keys = [
        'stop_id','candidate_id','source_type','source_feature_id','confidence','confidence_reasons',
        'review_flags','review_reasons','environment_profile','nearest_water_meters',
        'nearest_major_road_meters','nearest_school_meters','nearest_barrier_type',
        'nearest_barrier_meters','distance_to_bbox_edge_meters','alternative_displacement_meters',
        'alternative_direction','rejection_reason'
      ];
      const slim = {};
      keys.forEach(k => { if (props && props[k] != null) slim[k] = props[k]; });
      detail.innerHTML = '<div><strong>'+kind+'</strong></div><pre>'+JSON.stringify(slim, null, 2)+'</pre>';
    }

    function pin(cls) {
      return L.divIcon({ className:'', html:'<div class="pin '+cls+'"></div>', iconSize:[22,22], iconAnchor:[11,11] });
    }

    function accClass(p) {
      if (p.near_bbox_edge) return 'pin-edge';
      if (p.near_barrier) return 'pin-barrier';
      if (p.near_school) return 'pin-school';
      if (p.near_water) return 'pin-water';
      if (p.confidence != null && p.confidence < (s.lowConfidenceThreshold ?? 0.75)) return 'pin-low';
      return 'pin-accepted';
    }

    const sampleIds = new Set((window.__SAMPLE__.features||[]).map(f => f.properties && f.properties.stop_id));
    const acceptedMarkers = [];
    const acceptedById = {};

    const acceptedLayer = L.layerGroup().addTo(map);
    (window.__ACCEPTED__.features||[]).forEach(f => {
      const p = f.properties || {};
      const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
      const m = L.marker(latlng, { icon: pin(accClass(p)), zIndexOffset: 500 });
      m.bindTooltip((p.stop_id||'')+' · '+(p.source_type||'')+' · c='+(p.confidence??''));
      m.on('click', () => showProps(p, 'Accepted'));
      m._props = p;
      acceptedMarkers.push(m);
      acceptedById[p.stop_id] = m;
      m.addTo(acceptedLayer);
    });

    const sampleLayer = L.layerGroup().addTo(map);
    (window.__SAMPLE__.features||[]).forEach(f => {
      const p = f.properties || {};
      const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
      const m = L.marker(latlng, { icon: pin('pin-sample'), zIndexOffset: 700 });
      m.on('click', () => showProps(p, 'Review sample'));
      m._props = p;
      m.addTo(sampleLayer);
    });

    const rejectedLayer = L.layerGroup();
    const rejectedMarkers = [];
    (window.__REJECTED__.features||[]).forEach(f => {
      const p = f.properties || {};
      const reason = p.rejection_reason || '';
      if (reason === 'outside_test_area' || reason === 'too_close_to_existing_stop') return;
      const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
      const m = L.marker(latlng, { icon: pin('pin-rejected'), opacity: 0.9 });
      m.on('click', () => showProps(p, 'Rejected'));
      m._props = p;
      rejectedMarkers.push(m);
    });

    function accMatch(p, filters) {
      if (filters.all) return true;
      let ok = false;
      if (filters.low && p.confidence != null && p.confidence < (window.__SUMMARY__.lowConfidenceThreshold ?? 0.75)) ok = true;
      if (filters.water && p.near_water) ok = true;
      if (filters.school && p.near_school) ok = true;
      if (filters.barrier && p.near_barrier) ok = true;
      if (filters.edge && p.near_bbox_edge) ok = true;
      if (filters.sample && sampleIds.has(p.stop_id)) ok = true;
      return ok;
    }

    function rejMatch(p, filters) {
      if (!filters.enable) return false;
      const r = p.rejection_reason || '';
      if (filters.water && (r.includes('water'))) return true;
      if (filters.trunk && (r.includes('trunk') || r.includes('motorway') || r.includes('primary'))) return true;
      if (filters.barrier && (r.includes('barrier') || r.includes('school'))) return true;
      if (filters.edge && r === 'near_bbox_edge') return true;
      if (filters.other) {
        if (r === 'outside_test_area' || r === 'too_close_to_existing_stop') return false;
        if (filters.water && r.includes('water')) return false;
        if (filters.trunk && (r.includes('trunk') || r.includes('motorway') || r.includes('primary'))) return false;
        if (filters.barrier && (r.includes('barrier') || r.includes('school'))) return false;
        if (filters.edge && r === 'near_bbox_edge') return false;
        return true;
      }
      return false;
    }

    function readFilters() {
      const acc = {};
      document.querySelectorAll('[data-acc]').forEach(el => { acc[el.getAttribute('data-acc')] = el.checked; });
      const rej = {};
      document.querySelectorAll('[data-rej]').forEach(el => { rej[el.getAttribute('data-rej')] = el.checked; });
      return { acc, rej };
    }

    function refresh() {
      const { acc, rej } = readFilters();
      acceptedLayer.clearLayers();
      sampleLayer.clearLayers();
      rejectedLayer.clearLayers();
      acceptedMarkers.forEach(m => {
        if (accMatch(m._props, acc)) m.addTo(acceptedLayer);
      });
      if (acc.sample) {
        (window.__SAMPLE__.features||[]).forEach(f => {
          const p = f.properties || {};
          // only show sample ring if underlying accepted still matching OR sample filter alone
          const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
          const m = L.marker(latlng, { icon: pin('pin-sample'), zIndexOffset: 700 });
          m.on('click', () => showProps(p, 'Review sample'));
          m.addTo(sampleLayer);
        });
      }
      if (rej.enable) {
        rejectedLayer.addTo(map);
        rejectedMarkers.forEach(m => {
          if (rejMatch(m._props, rej)) m.addTo(rejectedLayer);
        });
      } else {
        map.removeLayer(rejectedLayer);
      }
    }

    document.querySelectorAll('#sidebar input[type=checkbox]').forEach(el => {
      el.addEventListener('change', refresh);
    });

    const list = document.getElementById('stop-list');
    (window.__ACCEPTED__.features||[]).slice().sort((a,b) => {
      const aid=(a.properties&&a.properties.stop_id)||'';
      const bid=(b.properties&&b.properties.stop_id)||'';
      return aid<bid?-1:aid>bid?1:0;
    }).forEach(f => {
      const p = f.properties || {};
      const li = document.createElement('li');
      const flags = (p.review_flags||[]).slice(0,3).join(', ');
      li.innerHTML = '<div><strong>'+(p.stop_id||'')+'</strong>'+(sampleIds.has(p.stop_id)?' · review':'')+'</div>'+
        '<div class="muted">'+(p.source_type||'')+' · c='+(p.confidence??'')+(flags?(' · '+flags):'')+'</div>';
      li.onclick = () => {
        [...list.children].forEach(c => c.classList.remove('active'));
        li.classList.add('active');
        const m = acceptedById[p.stop_id];
        if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 17)); m.openTooltip(); }
        showProps(p, sampleIds.has(p.stop_id) ? 'Accepted (review sample)' : 'Accepted');
      };
      list.appendChild(li);
    });

    const bounds = L.latLngBounds(acceptedMarkers.map(m => m.getLatLng()));
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.25));
    else map.setView([53.0442, -2.1656], 15);

    refresh();
    setTimeout(() => map.invalidateSize(), 80);
    setTimeout(() => map.invalidateSize(), 300);
  })();
  </script>
</body>
</html>`;
}
