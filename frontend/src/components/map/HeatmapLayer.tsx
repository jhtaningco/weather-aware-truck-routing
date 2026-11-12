import L from 'leaflet';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatmapResponse } from '../../types/api';

interface HeatmapLayerProps {
  heatmap: HeatmapResponse | null | undefined;
  currentHour: number; // 0 to 48
  visible: boolean;
}

// Exact risk colors with alphas for continuous canvas gradient blending
const RISK_CANVAS_COLORS: Record<number, { core: string; edge: string }> = {
  0: {
    core: 'rgba(18, 183, 106, 0.28)', // Low
    edge: 'rgba(18, 183, 106, 0.0)',
  },
  1: {
    core: 'rgba(253, 176, 34, 0.55)', // Moderate
    edge: 'rgba(253, 176, 34, 0.0)',
  },
  2: {
    core: 'rgba(249, 115, 22, 0.70)', // High
    edge: 'rgba(249, 115, 22, 0.0)',
  },
  3: {
    core: 'rgba(217, 45, 32, 0.85)', // Severe
    edge: 'rgba(217, 45, 32, 0.0)',
  },
  4: {
    core: 'rgba(122, 31, 31, 0.95)', // No Travel
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
    const radius = Math.max(16, Math.min(48, Math.round(20 * Math.pow(1.15, zoom - 6))));
    const hourIdx = Math.max(0, Math.min(48, currentHour));

    for (let i = 0; i < heatmap.points.length; i++) {
      const ptCoords = heatmap.points[i];
      if (!ptCoords) continue;
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

      const riskLevel = heatmap.risk[i]?.[hourIdx] ?? 0;
      const colorSpec = RISK_CANVAS_COLORS[riskLevel] ?? RISK_CANVAS_COLORS[0]!;

      const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      gradient.addColorStop(0, colorSpec.core);
      gradient.addColorStop(0.7, colorSpec.core.replace(/[\d.]+\)$/, '0.25)'));
      gradient.addColorStop(1, colorSpec.edge);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [map, visible, heatmap, currentHour]);

  // Attach canvas element once to map overlayPane
  useEffect(() => {
    const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';

    const pane = map.getPanes().overlayPane;
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
