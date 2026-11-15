import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from '../../lib/leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { Layers, Eye, EyeOff, RotateCcw, Activity } from 'lucide-react';

const gradient = {
  0.15: '#06b6d4', // Cyan (Surveillance / Baseline)
  0.35: '#10b981', // Emerald (Controlled)
  0.55: '#f59e0b', // Amber (Moderate Outbreak)
  0.75: '#f97316', // Orange (Elevated Outbreak)
  0.90: '#ef4444', // Red (Critical Surge)
  1.00: '#991b1b'  // Crimson (Extreme Epidemic Peak)
};

// Generates an organic multi-point heat dispersion plume around each hospital
function generateHeatPoints(hospitals, scale = 1.0) {
  const points = [];
  hospitals.forEach((h) => {
    const intensity = (h.intensity ?? 0.4) * scale;
    // Core epicenter
    points.push([h.lat, h.lng, Math.min(1.0, intensity * 1.25)]);

    // Realistic regional community spread offsets around the facility
    const offsets = [
      [0.05, 0.04, 0.78],
      [-0.04, -0.05, 0.72],
      [0.06, -0.04, 0.65],
      [-0.05, 0.06, 0.68],
      [0.10, 0.08, 0.48],
      [-0.09, -0.07, 0.42],
      [0.14, -0.02, 0.32],
      [-0.03, 0.13, 0.30]
    ];

    offsets.forEach(([dlat, dlng, factor]) => {
      points.push([
        h.lat + dlat,
        h.lng + dlng,
        Math.min(1.0, intensity * factor)
      ]);
    });
  });
  return points;
}

function addPulseMarker(map, h, onClick, isActive) {
  const isHighRisk = (h.intensity ?? 0) >= 0.6;
  const isMedRisk = (h.intensity ?? 0) >= 0.4;
  const strokeColor = isHighRisk ? '#dc2626' : (isMedRisk ? '#d97706' : '#0284c7');
  const beaconColor = isHighRisk ? '#ef4444' : (isMedRisk ? '#f59e0b' : '#38bdf8');

  // Pulsing beacon ring around the pin
  const beacon = L.circleMarker([h.lat, h.lng], {
    radius: isActive ? 12 : 8,
    color: beaconColor,
    weight: 1.5,
    fillColor: beaconColor,
    fillOpacity: 0.18
  }).addTo(map);

  // Clean, crisp white hospital pin in the center (does not occlude heat)
  const dot = L.circleMarker([h.lat, h.lng], {
    radius: isActive ? 7 : 5,
    color: strokeColor,
    weight: isActive ? 2.5 : 2,
    fillColor: '#ffffff',
    fillOpacity: 1.0
  }).addTo(map);

  const riskLabel = isHighRisk ? 'High Risk' : (isMedRisk ? 'Moderate' : 'Low');
  const riskBadgeStyle = isHighRisk 
    ? 'background:#fee2e2;color:#b91c1c;' 
    : (isMedRisk ? 'background:#fef3c7;color:#92400e;' : 'background:#e0f2fe;color:#0369a1;');

  dot.bindTooltip(
    `<div style="font-family:system-ui,-apple-system,sans-serif;padding:3px 5px;">
       <div style="font-weight:700;color:#0f172a;font-size:12px;">${h.name}</div>
       <div style="display:flex;align-items:center;gap:6px;margin-top:2px;font-size:11px;">
         <span style="color:#64748b;">${h.city || ''}</span>
         <span style="padding:1px 6px;border-radius:4px;font-weight:600;${riskBadgeStyle}">${riskLabel} (${Math.round((h.intensity || 0) * 100)}%)</span>
       </div>
     </div>`,
    { direction: 'top', offset: [0, -6] }
  );

  const clickHandler = () => onClick && onClick(h);
  dot.on('click', clickHandler);
  beacon.on('click', clickHandler);

  // Breathing animation on beacon
  let r = isActive ? 10 : 7;
  let growing = true;
  const timer = setInterval(() => {
    r += growing ? 0.35 : -0.35;
    if (r >= (isActive ? 16 : 12)) growing = false;
    if (r <= (isActive ? 9 : 6)) growing = true;
    beacon.setRadius(r);
  }, 90);

  return () => {
    clearInterval(timer);
    try { map.removeLayer(dot); } catch(e) {}
    try { map.removeLayer(beacon); } catch(e) {}
  };
}

export default function OutbreakHeatmap({ hospitals = [], selected, onSelectHospital, live = true }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const heatRef = useRef(null);
  const markersCleanupRef = useRef([]);
  const [isLive, setIsLive] = useState(!!live);
  const [showPins, setShowPins] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const liveTimerRef = useRef(null);

  const fitAllBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || hospitals.length === 0) return;
    const size = map.getSize();
    // Guard against 0x0 container size (which causes Leaflet fitBounds to reset zoom to 0)
    if (!size || size.x < 150 || size.y < 150) {
      map.setView([21.8, 78.96], 5);
      return;
    }
    const lats = hospitals.map(h => h.lat);
    const lngs = hospitals.map(h => h.lng);
    const bounds = L.latLngBounds(
      [Math.min(...lats) - 1.0, Math.min(...lngs) - 1.0],
      [Math.max(...lats) + 1.0, Math.max(...lngs) + 1.0]
    );
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 6 });
  }, [hospitals]);

  // Map Initialization
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // StrictMode / clean-up safeguard: wipe container to avoid duplicate nested panes
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch(e) {}
      mapRef.current = null;
    }
    container.innerHTML = '';
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      center: [21.8, 78.96], // Geographic center of India
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false
    });
    mapRef.current = map;

    // English-only Esri World Street Map layer (reliable, no API key required, crisp labels)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
    }).addTo(map);

    // Initial heat layer with dispersion plumes
    const heatPoints = generateHeatPoints(hospitals, 1.0);
    try {
      const heat = L.heatLayer(heatPoints, {
        radius: 52,
        blur: 32,
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.35,
        gradient
      }).addTo(map);
      heatRef.current = heat;
    } catch (heatErr) {
      console.warn("Leaflet heat layer creation warning:", heatErr);
    }

    // Hospital markers
    if (showPins) {
      markersCleanupRef.current = hospitals.map(h =>
        addPulseMarker(map, h, onSelectHospital, selected && selected.id === h.id)
      );
    }

    // ResizeObserver ensures map.invalidateSize() is called the instant container dimensions stabilize
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 100 && entry.contentRect.height > 100) {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
              fitAllBounds();
            }
          }
        }
      });
      resizeObserver.observe(container);
    }

    // Initial fallback timer
    const resizeTimer = setTimeout(() => {
      try {
        map.invalidateSize();
        fitAllBounds();
      } catch (e) {}
    }, 300);

    // Custom Interactive Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div style="
          background:rgba(255,255,255,0.95);
          backdrop-filter:blur(8px);
          color:#0f172a;
          padding:10px 14px;
          border-radius:12px;
          box-shadow:0 8px 24px rgba(0,0,0,0.12);
          font-size:12px;
          border:1px solid #e2e8f0;
          font-family:system-ui,-apple-system,sans-serif;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <span style="font-weight:700;color:#0f172a;">Outbreak Heat Intensity</span>
            <span style="font-size:10px;color:#10b981;font-weight:600;background:#d1fae5;padding:1px 5px;border-radius:4px;">LIVE</span>
          </div>
          <div style="height:10px;width:180px;border-radius:999px;background:linear-gradient(90deg,#06b6d4,#10b981,#f59e0b,#f97316,#ef4444,#991b1b)"></div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#64748b;font-weight:500;">
            <span>Low (Surveillance)</span>
            <span>Critical Surge</span>
          </div>
        </div>`;
      return div;
    };
    legend.addTo(map);

    return () => {
      clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      markersCleanupRef.current.forEach(fn => fn && fn());
      markersCleanupRef.current = [];
      if (heatRef.current) {
        try { map.removeLayer(heatRef.current); } catch(e) {}
        heatRef.current = null;
      }
      try { map.remove(); } catch(e) {}
      mapRef.current = null;
      container.innerHTML = '';
      delete container._leaflet_id;
    };
  }, []); // Mount once

  // Re-draw markers when selection or showPins changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersCleanupRef.current.forEach(fn => fn && fn());
    markersCleanupRef.current = [];

    if (showPins) {
      markersCleanupRef.current = hospitals.map(h =>
        addPulseMarker(map, h, onSelectHospital, selected && selected.id === h.id)
      );
    }
  }, [selected, hospitals, onSelectHospital, showPins]);

  // Toggle Heatmap visibility
  useEffect(() => {
    const map = mapRef.current;
    const heat = heatRef.current;
    if (!map || !heat) return;

    if (showHeatmap) {
      if (!map.hasLayer(heat)) map.addLayer(heat);
    } else {
      if (map.hasLayer(heat)) map.removeLayer(heat);
    }
  }, [showHeatmap]);

  // Live breathing heat animation
  useEffect(() => {
    if (!isLive || !showHeatmap) {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
      return;
    }
    const heat = heatRef.current;
    if (!heat) return;

    let t = 0;
    const id = setInterval(() => {
      t += 0.12;
      // Gentle cyclical fluctuation (+/- 8%) simulating active transmission dynamics
      const wave = 1.0 + 0.08 * Math.sin(t);
      const pts = generateHeatPoints(hospitals, wave);
      heat.setLatLngs(pts);
    }, 450);

    liveTimerRef.current = id;
    return () => {
      clearInterval(id);
      liveTimerRef.current = null;
    };
  }, [isLive, hospitals, showHeatmap]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800">MDR Outbreak Regional Heatmap</h3>
          </div>
          {selected && (
            <div className="text-sm text-slate-600 mt-1">
              Active Focus:&nbsp;<span className="font-semibold text-slate-900">{selected.name}</span>
              {selected.city ? `, ${selected.city}` : ''}
              <span className={`ml-2 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                selected.intensity >= 0.6
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : selected.intensity >= 0.4
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                Risk: {Math.round((selected.intensity || 0) * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Heatmap */}
          <button
            onClick={() => setShowHeatmap(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              showHeatmap
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle Heatmap Layer"
          >
            <Layers className="h-3.5 w-3.5" />
            {showHeatmap ? 'Heatmap: ON' : 'Heatmap: OFF'}
          </button>

          {/* Toggle Pins */}
          <button
            onClick={() => setShowPins(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              showPins
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle Hospital Pins"
          >
            {showPins ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {showPins ? 'Pins: ON' : 'Pins: OFF'}
          </button>

          {/* Live Animation Toggle */}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle live animation"
          >
            {isLive ? '⏸️ Live Pulse' : '▶️ Resume Pulse'}
          </button>

          {/* Reset Map View */}
          <button
            onClick={fitAllBounds}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Fit to India"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Recenter
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div 
        id="mdr-heatmap" 
        ref={mapContainerRef} 
        className="w-full h-[500px] min-h-[500px] rounded-xl overflow-hidden shadow-inner border border-slate-200" 
      />
    </div>
  );
}
