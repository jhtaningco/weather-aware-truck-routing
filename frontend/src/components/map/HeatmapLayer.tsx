import L from 'leaflet';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatmapResponse } from '../../types/api';

interface HeatmapLayerProps {
  heatmap: HeatmapResponse | null | undefined;
  currentHour: number; // 0 to 48
  visible: boolean;
}

// Exact risk colors for atmospheric weather hazard halos.
// Risk 0 (Low / Calm) is transparent: safe clear conditions do NOT cover the highways with green paint.
// Only active weather hazards (Moderate = Yellow, High = Orange, Severe = Red, No Travel = Maroon) glow.
const RISK_CANVAS_COLORS: Record<number, { core: string; edge: string }> = {
  0: {
    core: 'rgba(18, 183, 106, 0.0)', // Calm / clear baseline (transparent)
    edge: 'rgba(18, 183, 106, 0.0)',
  },
  1: {
    core: 'rgba(253, 176, 34, 0.40)', // Moderate (Yellow/Amber)
    edge: 'rgba(253, 176, 34, 0.0)',
  },
  2: {
    core: 'rgba(249, 115, 22, 0.55)', // High (Orange)
    edge: 'rgba(249, 115, 22, 0.0)',
  },
  3: {
    core: 'rgba(217, 45, 32, 0.70)', // Severe (Red)
    edge: 'rgba(217, 45, 32, 0.0)',
  },
  4: {
    core: 'rgba(122, 31, 31, 0.85)', // No Travel (Deep Crimson)
    edge: 'rgba(122, 31, 31, 0.0)',
  },
};

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  heatmap,
  currentHour,
  visible,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!visible || !heatmap || !heatmap.points || heatmap.points.length === 0) {
      canvas.style.display = 'none';
      return;
    }
    canvas.style.display = 'block';

    const size = map.getSize();
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const zoom = map.getZoom();
    const radius = Math.max(16, Math.min(42, Math.round(18 * Math.pow(1.12, zoom - 6))));
    const hourIdx = Math.max(0, Math.min(48, currentHour));

    for (let i = 0; i < heatmap.points.length; i++) {
      const ptCoords = heatmap.points[i];
      if (!ptCoords) continue;

      const riskLevel = heatmap.risk[i]?.[hourIdx] ?? 0;
      // Skip Risk 0 (calm / safe baseline): clear weather leaves roads and basemap crisp & clear
      if (riskLevel === 0) continue;

      const [lat, lon] = ptCoords;
      const pt = map.latLngToContainerPoint([lat, lon]);

      if (
        pt.x < -radius ||
        pt.x > canvas.width + radius ||
        pt.y < -radius ||
        pt.y > canvas.height + radius
      ) {
        continue;
      }

      const colorSpec = RISK_CANVAS_COLORS[riskLevel] ?? RISK_CANVAS_COLORS[1]!;

      const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      gradient.addColorStop(0, colorSpec.core);
      gradient.addColorStop(0.65, colorSpec.core.replace(/[\d.]+\)$/, '0.18)'));
      gradient.addColorStop(1, colorSpec.edge);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [map, visible, heatmap, currentHour]);

  // Attach canvas element once to custom heatmapPane (zIndex 300, below vector overlayPane at 400)
  useEffect(() => {
    let pane = map.getPane('heatmapPane');
    if (!pane) {
      pane = map.createPane('heatmapPane');
      pane.style.zIndex = '300';
      pane.style.pointerEvents = 'none';
    }

    const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';

    pane.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
    };
  }, [map]);

  // Subscribe to map pan/zoom/resize events
  useEffect(() => {
    map.on('move', drawCanvas);
    map.on('zoom', drawCanvas);
    map.on('resize', drawCanvas);

    // Initial draw
    drawCanvas();

    return () => {
      map.off('move', drawCanvas);
      map.off('zoom', drawCanvas);
      map.off('resize', drawCanvas);
    };
  }, [map, drawCanvas]);

  return null;
};
