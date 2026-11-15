import L from 'leaflet';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatmapResponse } from '../../types/api';

interface HeatmapLayerProps {
  heatmap: HeatmapResponse | null | undefined;
  currentHour: number; // 0 to 48
  visible: boolean;
}

interface GradientStop {
  offset: number;
  color: string;
}

// Organic Continuous Density Heatmap Color Palettes (GIS / Leaflet.heat style).
// Smooth fluid transitions:
// - Risk 0 (Clear Skies): 100% transparent: highways and basemap remain pristine and clean.
// - Risk 1 (Moderate): Lush Emerald Green fringe -> Lime-Yellow body -> Warm Gold center.
// - Risk 2 (High / Crosswinds): Deep Green fringe -> Lime-Yellow body -> Warm Gold -> Vivid Amber-Orange core.
// - Risk 3 (Severe Storm): Deep Green fringe -> Gold -> Vivid Orange -> Deep Crimson / Ruby Red epicenter core.
// - Risk 4 (Extreme / No Travel): Deep Green fringe -> Gold -> Orange -> Crimson -> Dark Maroon / Burgundy core.
const HEATMAP_STOPS: Record<number, GradientStop[]> = {
  1: [
    { offset: 0.0, color: 'rgba(234, 179, 8, 0.72)' },   // Warm Gold center
    { offset: 0.35, color: 'rgba(163, 230, 53, 0.62)' }, // Lime / Yellow-Green
    { offset: 0.70, color: 'rgba(34, 197, 94, 0.48)' },  // Lush Emerald Green body
    { offset: 0.92, color: 'rgba(21, 128, 61, 0.22)' },  // Deep Green outer contour
    { offset: 1.0, color: 'rgba(21, 128, 61, 0.0)' },    // Soft fade
  ],
  2: [
    { offset: 0.0, color: 'rgba(249, 115, 22, 0.88)' },  // Vivid Orange hotspot
    { offset: 0.28, color: 'rgba(234, 179, 8, 0.76)' },  // Warm Gold
    { offset: 0.58, color: 'rgba(132, 204, 22, 0.60)' }, // Lime-Yellow
    { offset: 0.82, color: 'rgba(34, 197, 94, 0.45)' },  // Emerald Green body
    { offset: 0.95, color: 'rgba(21, 128, 61, 0.20)' },  // Deep Green fringe
    { offset: 1.0, color: 'rgba(21, 128, 61, 0.0)' },    // Soft fade
  ],
  3: [
    { offset: 0.0, color: 'rgba(185, 28, 28, 0.96)' },   // Deep Crimson / Ruby Red severe core
    { offset: 0.22, color: 'rgba(239, 68, 68, 0.88)' },  // Bright Red
    { offset: 0.45, color: 'rgba(249, 115, 22, 0.78)' }, // Vivid Orange
    { offset: 0.70, color: 'rgba(234, 179, 8, 0.60)' },  // Gold / Yellow
    { offset: 0.88, color: 'rgba(34, 197, 94, 0.42)' },  // Emerald Green
    { offset: 0.96, color: 'rgba(21, 128, 61, 0.18)' },  // Deep Green fringe
    { offset: 1.0, color: 'rgba(21, 128, 61, 0.0)' },
  ],
  4: [
    { offset: 0.0, color: 'rgba(127, 29, 29, 0.98)' },   // Dark Blood Red / Maroon core
    { offset: 0.20, color: 'rgba(185, 28, 28, 0.92)' },  // Deep Crimson
    { offset: 0.42, color: 'rgba(239, 68, 68, 0.84)' },  // Bright Red
    { offset: 0.62, color: 'rgba(249, 115, 22, 0.72)' }, // Vivid Orange
    { offset: 0.80, color: 'rgba(234, 179, 8, 0.54)' },  // Gold
    { offset: 0.92, color: 'rgba(34, 197, 94, 0.38)' },  // Green
    { offset: 1.0, color: 'rgba(21, 128, 61, 0.0)' },
  ],
};

interface ActiveCell {
  x: number;
  y: number;
  radius: number;
  riskLevel: number;
}

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

    // Gather visible active hazard storm cells (Risk 1-4)
    const activeCells: ActiveCell[] = [];
    const maxScreenRadius = Math.round(Math.max(canvas.width, canvas.height) * 0.38);

    for (let i = 0; i < heatmap.points.length; i++) {
      const ptCoords = heatmap.points[i];
      if (!ptCoords) continue;

      const riskLevel = heatmap.risk[i]?.[hourIdx] ?? 0;
      // Clear skies (Risk 0) are 100% clean & transparent: zero green slug or cosmetic powder over highways
      if (riskLevel === 0) continue;

      const [lat, lon] = ptCoords;
      const pt = map.latLngToContainerPoint([lat, lon]);

      // Physical storm cell radius: ~48 miles (76,000 meters) footprint
      // Ensures adjacent corridor checkpoints continuously merge without dispersing
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const stormFootprintMeters = 76000;
      const radius = Math.min(
        maxScreenRadius,
        Math.max(30, Math.round(stormFootprintMeters / Math.max(metersPerPixel, 0.1)))
      );

      if (
        pt.x < -radius ||
        pt.x > canvas.width + radius ||
        pt.y < -radius ||
        pt.y > canvas.height + radius
      ) {
        continue;
      }

      activeCells.push({ x: pt.x, y: pt.y, radius, riskLevel });
    }

    if (activeCells.length === 0) return;

    // Sort cells by riskLevel ascending:
    // Broad green bodies render first, so hotter orange and deep red centers bloom on top
    activeCells.sort((a, b) => a.riskLevel - b.riskLevel);

    // Continuous organic density rendering:
    // Smooth radial gradients with color ramps (Green fringe -> Yellow -> Orange -> Crimson core)
    for (const cell of activeCells) {
      const stops = HEATMAP_STOPS[cell.riskLevel];
      if (!stops) continue;

      const grad = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, cell.radius);
      for (const stop of stops) {
        grad.addColorStop(stop.offset, stop.color);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
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
    // Organic continuous fluid density heatmap with smooth edge blending
    canvas.style.filter = 'blur(8px)';
    canvas.style.opacity = '0.86';
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
