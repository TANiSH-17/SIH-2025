// frontend/src/components/LeafletMap.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const hospitals = [
    { id: 1, name: "AIIMS Delhi", position: [28.5663, 77.2118] },
    { id: 2, name: "KEM Mumbai", position: [19.0061, 72.8430] },
    { id: 3, name: "NIMS Hyderabad", position: [17.4330, 78.4452] },
];

export default function LeafletMap() {
  const indiaCenter = [22.5937, 78.9629]; // Center of India

  return (
    <MapContainer center={indiaCenter} zoom={5} style={{ height: '400px', width: '100%', borderRadius: '1.5rem', zIndex: 0 }}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
        attribution="Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ"
      />
      {hospitals.map(hospital => (
        <Marker key={hospital.id} position={hospital.position}>
          <Popup>{hospital.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}