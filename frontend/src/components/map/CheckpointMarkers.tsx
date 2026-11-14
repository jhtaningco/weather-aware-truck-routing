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

  // Initialize LayerGroup on map once with dedicated high z-index pane (550)
  // Ensures checkpoint circles are ALWAYS rendered above route polylines (zIndex 400)
  useEffect(() => {
    let pane = map.getPane('checkpointPane');
    if (!pane) {
      pane = map.createPane('checkpointPane');
      pane.style.zIndex = '550';
    }

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
        pane: 'checkpointPane',
        radius: 7.5,
        fillColor: spec.solid,
        color: '#FFFFFF',
        weight: 2.5,
        fillOpacity: 1.0,
        className: 'leaflet-truck-checkpoint-marker',
      });

      // HTML popup with rich checkpoint information
      const popupHtml = createCheckpointPopupHtml(cp, selectedRoute.distance_mi, loadLb);
      marker.bindPopup(popupHtml, {
        minWidth: 260,
        maxWidth: 320,
        className: 'leaflet-truck-checkpoint-popup',
        autoPan: true,
      });

      // Explicit click handler to reliably open popup and prevent click bubbling to route polyline
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        marker.openPopup();
      });

      // Hover emphasis
      marker.on('mouseover', () => {
        marker.setRadius(10);
      });
      marker.on('mouseout', () => {
        marker.setRadius(7.5);
      });

      group.addLayer(marker);
    });
  }, [selectedRoute, loadLb]);

  return null;
};
