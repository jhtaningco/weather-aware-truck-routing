import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { RouteOption } from '../../types/api';
import { ROUTE_COLORS } from '../routes/RouteList';

interface RouteLayersProps {
  routes: RouteOption[];
  recommendedRouteId: string;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

export const RouteLayers: React.FC<RouteLayersProps> = ({
  routes,
  recommendedRouteId,
  selectedRouteId,
  onSelectRoute,
}) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize LayerGroup on map once
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    layerGroupRef.current = group;

    return () => {
      group.remove();
      layerGroupRef.current = null;
    };
  }, [map]);

  // Imperatively render routes whenever routes or selection changes
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Render non-selected routes first so selected route is on top
    const sortedRoutes = [...routes].sort((a, b) => {
      if (a.id === selectedRouteId) return 1;
      if (b.id === selectedRouteId) return -1;
      return 0;
    });

    sortedRoutes.forEach((route, idx) => {
      const isRecommended = route.id === recommendedRouteId;
      const isSelected = route.id === selectedRouteId;

      // Map color scheme
      let strokeColor: string;
      let dashArray: string | undefined = undefined;

      if (isRecommended) {
        strokeColor = ROUTE_COLORS[0] ?? '#465FFF'; // Brand Blue
      } else if (idx === 1) {
        strokeColor = ROUTE_COLORS[1] ?? '#475467'; // Slate Neutral
      } else {
        strokeColor = ROUTE_COLORS[2] ?? '#0BA5EC'; // Sky Blue
        dashArray = '8, 8';
      }

      // GeoJSON [lon, lat] -> Leaflet [lat, lon]
      const latLngs = route.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon] as [number, number],
      );

      // Create polyline with high-fidelity styles
      const polyline = L.polyline(latLngs, {
        color: strokeColor,
        weight: isSelected ? 6.5 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Hover tooltip
      polyline.bindTooltip(
        `<strong>${route.label}</strong><br/>${route.distance_mi.toFixed(1)} mi • ${(route.duration_s / 3600).toFixed(1)}h`,
        {
          sticky: true,
          direction: 'top',
          className: 'leaflet-truck-route-tooltip',
        },
      );

      // Click to select route
      polyline.on('click', (e) => {
        if (!isSelected) {
          L.DomEvent.stopPropagation(e);
          onSelectRoute(route.id);
        }
      });

      // Hover emphasis
      polyline.on('mouseover', () => {
        if (!isSelected) {
          polyline.setStyle({ weight: 5.5, opacity: 0.9 });
        }
      });
      polyline.on('mouseout', () => {
        if (!isSelected) {
          polyline.setStyle({ weight: 4, opacity: 0.65 });
        }
      });

      group.addLayer(polyline);
    });
  }, [routes, recommendedRouteId, selectedRouteId, onSelectRoute]);

  return null;
};
