import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { LocationPoint } from '../../types/api';

interface WaypointMarkersProps {
  origin?: LocationPoint;
  destination?: LocationPoint;
}

export const WaypointMarkers: React.FC<WaypointMarkersProps> = ({
  origin,
  destination,
}) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    return () => {
      group.remove();
      layerGroupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (origin && typeof origin.lat === 'number' && typeof origin.lon === 'number') {
      const originIcon = L.divIcon({
        className: 'custom-waypoint-icon',
        html: `
          <div style="background-color: #12B76A; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-family: 'Outfit', sans-serif;">
            A
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const originMarker = L.marker([origin.lat, origin.lon], { icon: originIcon });
      originMarker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; font-size: 12px;">
          <strong style="color: #12B76A;">Origin / Start (A)</strong><br/>
          ${origin.label}
        </div>
      `);
      group.addLayer(originMarker);
    }

    if (destination && typeof destination.lat === 'number' && typeof destination.lon === 'number') {
      const destIcon = L.divIcon({
        className: 'custom-waypoint-icon',
        html: `
          <div style="background-color: #1D2939; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.3); font-family: 'Outfit', sans-serif;">
            B
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const destMarker = L.marker([destination.lat, destination.lon], { icon: destIcon });
      destMarker.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; font-size: 12px;">
          <strong style="color: #1D2939;">Destination / Finish (B)</strong><br/>
          ${destination.label}
        </div>
      `);
      group.addLayer(destMarker);
    }
  }, [origin, destination]);

  return null;
};
