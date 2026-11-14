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
// Risk 0 (Low / Calm) is a soft translucent green aura showing the safe corridor baseline.
// Active weather hazards (Moderate = Yellow, High = Orange, Severe = Red, No Travel = Maroon) glow vividly.
const RISK_CANVAS_COLORS: Record<number, { core: string; mid: string }> = {
  0: {
    core: 'rgba(34, 197, 94, 0.22)', // Low / Calm (soft atmospheric green corridor baseline)
    mid: 'rgba(34, 197, 94, 0.08)',
  },
  1: {
    core: 'rgba(234, 179, 8, 0.50)', // Moderate (Yellow/Amber)
    mid: 'rgba(234, 179, 8, 0.20)',
  },
  2: {
    core: 'rgba(249, 115, 22, 0.65)', // High (Vibrant Orange)
    mid: 'rgba(249, 115, 22, 0.28)',
  },
  3: {
    core: 'rgba(239, 68, 68, 0.80)', // Severe (Intense Red)
    mid: 'rgba(239, 68, 68, 0.35)',
  },
  4: {
    core: 'rgba(159, 18, 57, 0.90)', // No Travel (Deep Crimson)
    mid: 'rgba(159, 18, 57, 0.40)',
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
    const baseRadius = Math.max(28, Math.min(65, Math.round(32 * Math.pow(1.15, zoom - 6))));
    const hourIdx = Math.max(0, Math.min(48, currentHour));

    for (let i = 0; i < heatmap.points.length; i++) {
      const ptCoords = heatmap.points[i];
      if (!ptCoords) continue;

      const riskLevel = heatmap.risk[i]?.[hourIdx] ?? 0;
      const [lat, lon] = ptCoords;
      const pt = map.latLngToContainerPoint([lat, lon]);

      // Active weather hazards (Moderate/High/Severe) get a broader aura to represent storm fronts
      const radius = riskLevel > 0 ? Math.round(baseRadius * 1.3) : baseRadius;

      if (
        pt.x < -radius ||
        pt.x > canvas.width + radius ||
        pt.y < -radius ||
        pt.y > canvas.height + radius
      ) {
        continue;
      }

      const colorSpec = RISK_CANVAS_COLORS[riskLevel] ?? RISK_CANVAS_COLORS[0]!;

      // Multi-stop radial gradient for soft atmospheric cloud falloff
      const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      gradient.addColorStop(0, colorSpec.core);
      gradient.addColorStop(0.45, colorSpec.mid);
      gradient.addColorStop(0.8, colorSpec.mid.replace(/[\d.]+\)$/, '0.03)'));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

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
    // Smooth atmospheric blur filter blending discrete points into a Doppler weather front
    canvas.style.filter = 'blur(10px)';
    canvas.style.transition = 'opacity 0.2s ease';

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
