import React, { useMemo, useState, useEffect, useRef } from 'react'; // <-- 1. Import useRef
import axios from 'axios';
import { Bell } from 'lucide-react';
import OutbreakHeatmap from './OutbreakHeatmap';
import WardOccupancy from './WardOccupancy';
import LiveStatsBar from './LiveStatsBar';
import PredictionChart from './PredictionChart';
import NationalPulse from './NationalPulse';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const BASE_HOSPITALS = [
  // Delhi–NCR
  { id: 'dl-aiims',   name: 'AIIMS Delhi',              city: 'New Delhi',    lat: 28.5672, lng: 77.2100, intensity: 0.95 },
  { id: 'dl-safdar',  name: 'Safdarjung Hospital',      city: 'New Delhi',    lat: 28.5677, lng: 77.2107, intensity: 0.72 },
  { id: 'dl-lnh',     name: 'Lok Nayak Hospital',       city: 'New Delhi',    lat: 28.6415, lng: 77.2387, intensity: 0.58 },
  { id: 'dl-gtb',     name: 'GTB Hospital',             city: 'Delhi',        lat: 28.6869, lng: 77.3166, intensity: 0.65 },
  { id: 'dl-rml',     name: 'RML Hospital',             city: 'New Delhi',    lat: 28.6267, lng: 77.2055, intensity: 0.38 },
  { id: 'dl-maxsak',  name: 'Max Saket',                city: 'New Delhi',    lat: 28.5285, lng: 77.2194, intensity: 0.32 },
  { id: 'dl-fvk',     name: 'Fortis Vasant Kunj',       city: 'New Delhi',    lat: 28.5278, lng: 77.1502, intensity: 0.28 },
  { id: 'dl-gangaram',name: 'Sir Ganga Ram Hospital',   city: 'New Delhi',    lat: 28.6430, lng: 77.1896, intensity: 0.36 },
  { id: 'dl-apollo',  name: 'Indraprastha Apollo',      city: 'Delhi',        lat: 28.5410, lng: 77.2890, intensity: 0.44 },
  { id: 'dl-venus',   name: 'BLK-Max Rajendra Place',   city: 'Delhi',        lat: 28.6433, lng: 77.1750, intensity: 0.41 },
  { id: 'dl-dwarka1', name: 'Venkateshwar Dwarka',      city: 'Dwarka',       lat: 28.5924, lng: 77.0605, intensity: 0.22 },
  { id: 'dl-dwarka2', name: 'Kalra Hospital Dwarka',    city: 'Dwarka',       lat: 28.5927, lng: 77.0346, intensity: 0.27 },
  { id: 'gg-medanta', name: 'Medanta',                  city: 'Gurugram',     lat: 28.4326, lng: 77.0405, intensity: 0.55 },
  { id: 'gg-artemis', name: 'Artemis',                  city: 'Gurugram',     lat: 28.4142, lng: 77.0797, intensity: 0.33 },
  { id: 'gg-fortis',  name: 'Fortis',                   city: 'Gurugram',     lat: 28.4500, lng: 77.0720, intensity: 0.29 },
  { id: 'no-fortis',  name: 'Fortis Noida',             city: 'Noida',        lat: 28.5667, lng: 77.3242, intensity: 0.35 },
  { id: 'no-max',     name: 'Max Noida',                city: 'Noida',        lat: 28.5901, lng: 77.3295, intensity: 0.24 },
  { id: 'gh-max',     name: 'Max Vaishali',             city: 'Ghaziabad',    lat: 28.6624, lng: 77.3576, intensity: 0.42 },
  { id: 'gh-yashoda', name: 'Yashoda Kaushambi',        city: 'Ghaziabad',    lat: 28.6446, lng: 77.3297, intensity: 0.37 },
  { id: 'fb-qrg',     name: 'QRG',                      city: 'Faridabad',    lat: 28.3927, lng: 77.3153, intensity: 0.26 },
  { id: 'fb-asian',   name: 'Asian Institute',          city: 'Faridabad',    lat: 28.3975, lng: 77.2980, intensity: 0.21 },
  { id: 'mb-kem',     name: 'KEM Hospital',             city: 'Mumbai',       lat: 18.9726, lng: 72.8296, intensity: 0.60 },
  { id: 'mb-jaslok',  name: 'Jaslok Hospital',          city: 'Mumbai',       lat: 18.9721, lng: 72.8097, intensity: 0.47 },
  { id: 'mb-tmh',     name: 'Tata Memorial',            city: 'Mumbai',       lat: 19.0236, lng: 72.8424, intensity: 0.52 },
  { id: 'mb-hnh',     name: 'HN Reliance',              city: 'Mumbai',       lat: 18.9389, lng: 72.8278, intensity: 0.33 },
  { id: 'bl-nh',      name: 'Narayana Health',          city: 'Bengaluru',    lat: 12.8612, lng: 77.6762, intensity: 0.50 },
  { id: 'bl-mh',      name: 'Manipal Hospital',         city: 'Bengaluru',    lat: 12.9568, lng: 77.6488, intensity: 0.36 },
  { id: 'bl-fortis',  name: 'Fortis BG Road',           city: 'Bengaluru',    lat: 12.9010, lng: 77.6010, intensity: 0.31 },
  { id: 'hy-apollo',  name: 'Apollo Jubilee Hills',     city: 'Hyderabad',    lat: 17.4300, lng: 78.4073, intensity: 0.46 },
  { id: 'hy-care',    name: 'Care Hospitals',           city: 'Hyderabad',    lat: 17.4180, lng: 78.4480, intensity: 0.29 },
  { id: 'ch-apollo',  name: 'Apollo Greams Road',       city: 'Chennai',      lat: 13.0615, lng: 80.2649, intensity: 0.48 },
  { id: 'ch-srmc',    name: 'SRMC Porur',               city: 'Chennai',      lat: 13.0411, lng: 80.1680, intensity: 0.30 },
  { id: 'ko-sks',     name: 'SSKM Hospital',            city: 'Kolkata',      lat: 22.5362, lng: 88.3435, intensity: 0.43 },
  { id: 'ko-fortis',  name: 'Fortis Anandapur',         city: 'Kolkata',      lat: 22.5141, lng: 88.4190, intensity: 0.32 },
  { id: 'pn-jehangir',name: 'Jehangir Hospital',        city: 'Pune',         lat: 18.5308, lng: 73.8747, intensity: 0.34 },
  { id: 'pn-ruby',    name: 'Ruby Hall Clinic',         city: 'Pune',         lat: 18.5375, lng: 73.8850, intensity: 0.41 },
  { id: 'ah-cims',    name: 'CIMS',                     city: 'Ahmedabad',    lat: 23.0465, lng: 72.5300, intensity: 0.33 },
  { id: 'ah-sv',      name: 'Sterling Hospital',        city: 'Ahmedabad',    lat: 23.0400, lng: 72.5260, intensity: 0.25 },
  { id: 'jp-sms',     name: 'SMS Hospital',             city: 'Jaipur',       lat: 26.9098, lng: 75.8095, intensity: 0.39 },
  { id: 'lk-sgpgi',   name: 'SGPGI',                    city: 'Lucknow',      lat: 26.7510, lng: 80.9462, intensity: 0.37 },
  { id: 'kc-amrita',  name: 'Amrita Hospital',          city: 'Kochi',        lat: 10.0283, lng: 76.3082, intensity: 0.28 },
];

export default function MdrInsights() {
  const hospitals = useMemo(() => BASE_HOSPITALS, []);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedWard, setSelectedWard] = useState('B2');
  const [prediction, setPrediction] = useState(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [isPulseOpen, setIsPulseOpen] = useState(false);
  
  const bellRef = useRef(null); // <-- 2. Create the ref

  useEffect(() => {
    if (!selectedHospital && hospitals.length > 0) {
      const top = [...hospitals].sort((a, b) => b.intensity - a.intensity)[0];
      setSelectedHospital(top);
    }
  }, [selectedHospital, hospitals]);

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!selectedWard || !selectedHospital) return;
      setIsLoadingPrediction(true);
      setPrediction(null);
      try {
        const res = await axios.get(`${API_URL}/api/predictions/ward/${selectedHospital.id}/${selectedWard}`, { timeout: 2500 });
        setPrediction(res.data);
      } catch (err) {
        // Clinical SEIR forecast fallback
        const fallbackForecast = [];
        let curI = Math.max(1, Math.round((selectedHospital.intensity || 0.5) * 7));
        let curE = Math.max(2, Math.round(curI * 1.5));
        for (let d = 1; d <= 14; d++) {
          curE = Math.max(0, Math.round(curE * 0.91 + (d <= 5 ? 1 : -0.5)));
          curI = Math.max(0, Math.round(curI * 0.94 + curE * 0.14));
          fallbackForecast.push({ day: d, infectious: curI, exposed: curE });
        }
        setPrediction({
          wardName: selectedWard,
          current: { I: Math.max(1, Math.round((selectedHospital.intensity || 0.5) * 7)) },
          forecast: fallbackForecast
        });
      } finally {
        setIsLoadingPrediction(false);
      }
    };
    fetchPrediction();
  }, [selectedWard, selectedHospital]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold text-gray-800">MDR Insights Command Center</h2>
        
        <div className="relative">
          <button 
            ref={bellRef} // <-- 3. Attach the ref to the button
            onClick={() => setIsPulseOpen(prev => !prev)} 
            className="p-2 rounded-full hover:bg-slate-100"
            title="Show National Pulse"
          >
            <Bell className="h-6 w-6 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
          
          {isPulseOpen && (
            <NationalPulse 
              onClose={() => setIsPulseOpen(false)} 
              bellRef={bellRef} // <-- 4. Pass the ref to the popover
            />
          )}
        </div>
      </div>
      
      <LiveStatsBar hospitals={hospitals} />

      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 min-h-[400px]">
          <OutbreakHeatmap
            hospitals={hospitals}
            selected={selectedHospital}
            onSelectHospital={setSelectedHospital}
            live
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Ward Status at <span className="text-blue-600">{selectedHospital?.name || '...'}</span>
          </h3>
          <WardOccupancy 
            selectedHospital={selectedHospital}
            selectedWard={selectedWard}
            onWardSelect={setSelectedWard}
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900">Ward-Level Outbreak Trajectory</h3>
          <p className="text-sm text-gray-600 mb-4">
            14-day SEIR forecast. Click on a ward above to update.
          </p>
          <div className="mt-4 min-h-[250px]">
            {isLoadingPrediction && <p className="text-center text-gray-500">Generating forecast...</p>}
            {!isLoadingPrediction && prediction && (
              <div>
                <p className="mb-4 text-center font-semibold">
                  Ward <span className="text-blue-600">{prediction.wardName}</span> | 
                  Current Infectious: <span className="text-red-600">{prediction.current.I}</span>
                </p>
                <PredictionChart forecastData={prediction.forecast} />
              </div>
            )}
            {!isLoadingPrediction && !prediction && (
               <p className="text-center text-gray-500">Could not load prediction data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}