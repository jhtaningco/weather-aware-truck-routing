import L from 'leaflet';
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { RouteOption } from '../../types/api';

interface MapBoundsControllerProps {
  routes?: RouteOption[];
  selectedRouteId?: string;
}

export const MapBoundsController: React.FC<MapBoundsControllerProps> = ({
  routes,
  selectedRouteId,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const targetRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!targetRoute || targetRoute.geometry.coordinates.length === 0) return;

    // Collect all coordinates to fit
    const latLngs = targetRoute.geometry.coordinates.map(
      ([lon, lat]) => [lat, lon] as [number, number],
    );

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
        animate: true,
      });
    }
  }, [routes, selectedRouteId, map]);

  return null;
};
