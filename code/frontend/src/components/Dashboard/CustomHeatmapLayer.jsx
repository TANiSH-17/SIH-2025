import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from '../../lib/leaflet.heat';

export default function CustomHeatmapLayer({ data, radius, blur }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Transform your data into the [lat, lng, intensity] format
    const points = data.map(p => [p.lat, p.lng, p.intensity]).filter(Boolean);
    
    // Create a new heat layer
    const heatLayer = L.heatLayer(points, {
      radius: radius,
      blur: blur,
      maxZoom: 18,
    });

    // Add the layer to the map
    map.addLayer(heatLayer);

    // Cleanup function: remove the layer when the component unmounts or props change
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, data, radius, blur]); // Re-run effect if these props change

  return null; // This component doesn't render any visible JSX itself
}