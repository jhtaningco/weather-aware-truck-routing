import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { RouteOption } from '../../types/api';
import { RISK_LEVELS } from '../../types/risk';
import { createCheckpointPopupHtml } from './popupContent';

interface CheckpointMarkersProps {
  selectedRoute?: RouteOption;
  loadLb: number;
}

export const CheckpointMarkers: React.FC<CheckpointMarkersProps> = ({
  selectedRoute,
  loadLb,
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

  // Imperatively render checkpoint circles whenever selected route or load changes
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();
    if (!selectedRoute || !selectedRoute.checkpoints) return;

    selectedRoute.checkpoints.forEach((cp) => {
      const spec = RISK_LEVELS[cp.risk.level] ?? RISK_LEVELS[0];

      const marker = L.circleMarker([cp.lat, cp.lon], {
        radius: 6.5,
        fillColor: spec.solid,
        color: '#FFFFFF',
        weight: 2,
        fillOpacity: 0.95,
      });

      // HTML popup with rich checkpoint information
      const popupHtml = createCheckpointPopupHtml(cp, selectedRoute.distance_mi, loadLb);
      marker.bindPopup(popupHtml, {
        minWidth: 240,
        maxWidth: 320,
        className: 'leaflet-truck-checkpoint-popup',
      });

      // Hover emphasis
      marker.on('mouseover', () => {
        marker.setRadius(8.5);
      });
      marker.on('mouseout', () => {
        marker.setRadius(6.5);
      });

      group.addLayer(marker);
    });
  }, [selectedRoute, loadLb]);

  return null;
};
