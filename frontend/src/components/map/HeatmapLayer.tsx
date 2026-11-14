import L from 'leaflet';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatmapResponse } from '../../types/api';

interface HeatmapLayerProps {
  heatmap: HeatmapResponse | null | undefined;
  currentHour: number; // 0 to 48
  visible: boolean;
}

// Authentic Doppler weather radar hazard colors (NEXRAD / Windy / Apple Weather palette).
// Risk 0 (Clear Skies) is 100% transparent: sunny conditions never cover roads with green paint.
// Only active hazards (Moderate = Yellow, High = Orange, Severe = Red, No Travel = Deep Violet) render as solid storm fronts.
const RISK_CANVAS_COLORS: Record<number, { core: string; mid: string }> = {
  1: {
    core: 'rgba(250, 204, 21, 0.75)', // Moderate (Golden Yellow radar)
    mid: 'rgba(250, 204, 21, 0.40)',
  },
  2: {
    core: 'rgba(249, 115, 22, 0.85)', // High (Vivid Orange storm cell)
    mid: 'rgba(249, 115, 22, 0.48)',
  },
  3: {
    core: 'rgba(220, 38, 38, 0.92)', // Severe (Intense Doppler Red front)
    mid: 'rgba(220, 38, 38, 0.55)',
  },
  4: {
    core: 'rgba(147, 51, 234, 0.96)', // No Travel (Deep Violet / Purple extreme hazard)
    mid: 'rgba(147, 51, 234, 0.60)',
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
    const hourIdx = Math.max(0, Math.min(48, currentHour));

    for (let i = 0; i < heatmap.points.length; i++) {
      const ptCoords = heatmap.points[i];
      if (!ptCoords) continue;

      const riskLevel = heatmap.risk[i]?.[hourIdx] ?? 0;
      // Clear skies (Risk 0) are 100% clean & transparent: zero green slug or powder over highways
      if (riskLevel === 0) continue;

      const [lat, lon] = ptCoords;
      const pt = map.latLngToContainerPoint([lat, lon]);

      // Geographic radius calculation: maintain real physical footprint (~50 miles)
      // so adjacent cells continuously overlap and NEVER disperse into isolated dots when zoomed in
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const stormFootprintMeters = 80000; // ~50 miles physical radius for regional storm cells
      const radius = Math.max(35, Math.round(stormFootprintMeters / Math.max(metersPerPixel, 0.1)));

      if (
        pt.x < -radius ||
        pt.x > canvas.width + radius ||
        pt.y < -radius ||
        pt.y > canvas.height + radius
      ) {
        continue;
      }

      const colorSpec = RISK_CANVAS_COLORS[riskLevel];
      if (!colorSpec) continue;

      // Smooth Doppler radar cloud gradient: solid core with soft atmospheric perimeter falloff
      const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      gradient.addColorStop(0, colorSpec.core);
      gradient.addColorStop(0.55, colorSpec.mid);
      gradient.addColorStop(0.85, colorSpec.mid.replace(/[\d.]+\)$/, '0.08)'));
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
    canvas.style.filter = 'blur(12px)';
    canvas.style.opacity = '0.82';
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
