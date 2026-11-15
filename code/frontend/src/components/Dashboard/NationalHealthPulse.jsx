import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bot, Bug, Wind, Biohazard, Droplets, Loader2, RotateCcw } from 'lucide-react';
import PredictionCard from './PredictionCard';
import L from '../../lib/leaflet.heat';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// -------- Mock data generator --------
const generateGeographicalData = (maxCases) => {
  const cities = [
    { name: 'Delhi', lat: 28.70, lng: 77.10 },
    { name: 'Mumbai', lat: 19.07, lng: 72.87 },
    { name: 'Kolkata', lat: 22.57, lng: 88.36 },
    { name: 'Chennai', lat: 13.08, lng: 80.27 },
    { name: 'Bengaluru', lat: 12.97, lng: 77.59 },
    { name: 'Hyderabad', lat: 17.38, lng: 78.48 },
    { name: 'Pune', lat: 18.52, lng: 73.85 },
    { name: 'Jaipur', lat: 26.91, lng: 75.78 },
  ];
  const points = [];
  for (let i = 0; i < 200; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    points.push({
      lat: city.lat + (Math.random() - 0.5) * 3,
      lng: city.lng + (Math.random() - 0.5) * 3,
      intensity: Math.random() * maxCases,
    });
  }
  return points;
};

const mockGeographicalData = {
  dengue: {
    name: 'Dengue Fever',
    color: 'bg-blue-500',
    icon: Bug,
    data: generateGeographicalData(150),
    totalCases: 9500,
    mostAffected: 'Southern & Coastal States',
  },
  influenza: {
    name: 'Influenza',
    color: 'bg-orange-500',
    icon: Wind,
    data: generateGeographicalData(120),
    totalCases: 7200,
    mostAffected: 'Northern Indian Plains',
  },
  covid19: {
    name: 'COVID-19',
    color: 'bg-red-500',
    icon: Biohazard,
    data: generateGeographicalData(250),
    totalCases: 18740,
    mostAffected: 'Major Metros Nationwide',
  },
  malaria: {
    name: 'Malaria',
    color: 'bg-teal-500',
    icon: Droplets,
    data: generateGeographicalData(180),
    totalCases: 5400,
    mostAffected: 'Eastern & Central States',
  },
};

const DEFAULT_PREDICTIONS = [
  {
    _id: 'pred-1',
    disease: 'COVID-19 (JN.1 Surge)',
    location: 'Delhi & NCR Metros',
    predictedSpike: 'Next 5-8 Days',
    riskLevel: 'High Risk',
    reasoning: 'Winter indoor transmission density, positive velocity in clinical test clusters, and hospital surveillance indicate high surge probability.'
  },
  {
    _id: 'pred-2',
    disease: 'Dengue Serotype 2',
    location: 'Chennai & Coastal Tamil Nadu',
    predictedSpike: 'Next 10-14 Days',
    riskLevel: 'Medium Risk',
    reasoning: 'Post-monsoon precipitation indices and vector larvae density indices indicate moderate urban transmission.'
  },
  {
    _id: 'pred-3',
    disease: 'Influenza A (H3N2)',
    location: 'Mumbai & Western Maharashtra',
    predictedSpike: 'Next 12-16 Days',
    riskLevel: 'Low Risk',
    reasoning: 'Transmission velocity indices remain within historical seasonal baseline across sentinel surveillance hospitals.'
  }
];

export default function NationalHealthPulse() {
  const [activeDisease, setActiveDisease] = useState('covid19');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heatmapRadius, setHeatmapRadius] = useState(45);
  const [heatmapBlur, setHeatmapBlur] = useState(28);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/predictions`, { timeout: 2500 });
        if (response.data && response.data.length > 0) {
          setPredictions(response.data);
        } else {
          setPredictions(DEFAULT_PREDICTIONS);
        }
      } catch (err) {
        setPredictions(DEFAULT_PREDICTIONS);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  const diseaseInfo = mockGeographicalData[activeDisease];
  const DiseaseIcon = diseaseInfo.icon;

  // Initialize Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch(e) {}
      mapRef.current = null;
    }
    container.innerHTML = '';
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      center: [21.8, 78.96],
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

    // Initial Heat Layer
    const points = diseaseInfo.data.map(p => [p.lat, p.lng, p.intensity]);
    try {
      const heat = L.heatLayer(points, {
        radius: heatmapRadius,
        blur: heatmapBlur,
        maxZoom: 18,
        minOpacity: 0.35
      }).addTo(map);
      heatLayerRef.current = heat;
    } catch (e) {
      console.warn("Heat layer warning:", e);
    }

    // ResizeObserver ensures map is always 100% visible even after tab transitions
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 100 && entry.contentRect.height > 100) {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          }
        }
      });
      resizeObserver.observe(container);
    }

    const timer = setTimeout(() => {
      try { map.invalidateSize(); } catch(e) {}
    }, 250);

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      if (heatLayerRef.current) {
        try { map.removeLayer(heatLayerRef.current); } catch(e) {}
        heatLayerRef.current = null;
      }
      try { map.remove(); } catch(e) {}
      mapRef.current = null;
      container.innerHTML = '';
      delete container._leaflet_id;
    };
  }, []); // Mount once

  // Update Heat Layer data when activeDisease changes
  useEffect(() => {
    const heat = heatLayerRef.current;
    if (!heat || !diseaseInfo?.data) return;
    const points = diseaseInfo.data.map(p => [p.lat, p.lng, p.intensity]);
    heat.setLatLngs(points);
  }, [activeDisease, diseaseInfo]);

  // Update Heat Layer options when radius or blur sliders change
  useEffect(() => {
    const heat = heatLayerRef.current;
    if (!heat) return;
    heat.setOptions({
      radius: heatmapRadius,
      blur: heatmapBlur,
      minOpacity: 0.35
    });
  }, [heatmapRadius, heatmapBlur]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([21.8, 78.96], 5);
      mapRef.current.invalidateSize();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">National Health Pulse</h1>
          <p className="text-gray-500 mt-1">
            Live infectious disease tracking & AI-powered outbreak forecasting across India.
          </p>
        </div>
        <button
          onClick={handleRecenter}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        >
          <RotateCcw size={14} />
          Recenter India
        </button>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Disease Selector */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Disease Selector
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(mockGeographicalData).map((key) => {
                const Icon = mockGeographicalData[key].icon;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveDisease(key)}
                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
                      activeDisease === key
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon size={16} />
                    {mockGeographicalData[key].name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Heatmap Controls */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="radius" className="text-sm font-semibold text-gray-600">
                    Heatmap Radius
                  </label>
                  <span className="text-xs font-mono text-gray-500">{heatmapRadius}px</span>
                </div>
                <input
                  type="range"
                  id="radius"
                  min="15"
                  max="80"
                  value={heatmapRadius}
                  onChange={(e) => setHeatmapRadius(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="blur" className="text-sm font-semibold text-gray-600">
                    Heatmap Blur
                  </label>
                  <span className="text-xs font-mono text-gray-500">{heatmapBlur}px</span>
                </div>
                <input
                  type="range"
                  id="blur"
                  min="15"
                  max="80"
                  value={heatmapBlur}
                  onChange={(e) => setHeatmapBlur(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Live Data Insights */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Live Data Insights
            </h3>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <DiseaseIcon size={24} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Selected Outbreak</p>
                <p className="font-bold text-gray-800">{diseaseInfo.name}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">Total Reported Cases</p>
              <p className="text-3xl font-bold text-gray-900">
                {diseaseInfo.totalCases.toLocaleString()}
              </p>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Most Affected Region</p>
              <p className="font-semibold text-gray-800">{diseaseInfo.mostAffected}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg border border-gray-200 relative shadow-sm flex flex-col">
          <div className="absolute top-6 right-6 z-[1000] px-3 py-1 bg-yellow-400 text-yellow-950 text-xs font-bold rounded-full shadow-md flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            Live Demonstration
          </div>

          <div
            id="national-pulse-map"
            ref={mapContainerRef}
            className="w-full h-[560px] min-h-[560px] rounded-lg overflow-hidden border border-slate-200"
          />
        </div>
      </div>

      {/* Predictions */}
      <div className="bg-white p-8 rounded-2xl shadow-xl border overflow-hidden">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <Bot size={28} className="text-indigo-600" />
          <span>AI-Powered Future Outbreak Forecasts</span>
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-500">
            <Loader2 className="animate-spin mr-3" />
            <span>Generating predictions...</span>
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto p-2 -m-2">
            {predictions.length > 0 ? (
              predictions.map((pred) => (
                <div key={pred._id} className="flex-shrink-0 w-80">
                  <PredictionCard prediction={pred} />
                </div>
              ))
            ) : (
              <div className="w-full text-slate-500 text-center py-8">
                <p>No active forecasts found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
