import L from 'leaflet';
import React, { useCallback, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatmapResponse } from '../../types/api';

interface HeatmapLayerProps {
  heatmap: HeatmapResponse | null | undefined;
  currentHour: number; // 0 to 48
  visible: boolean;
}

interface RadarBand {
  radiusRatio: number; // fraction of full storm cell radius
  fill: string;        // stepped radar reflectivity fill
}

// Authentic Doppler Weather Radar Reflectivity Palette (NOAA / NEXRAD Level 3 / RadarOmega style).
// Discrete stepped contour bands (dBZ thresholds) with zero cosmetic blur and zero target strokes:
// - Risk 0 (Clear Skies): 100% transparent: highways and basemap remain pristine and clean.
// - Risk 1 (Moderate): Golden Yellow reflectivity halo + Gold core (dBZ 25-35).
// - Risk 2 (High / Crosswinds): Amber fringe + Vivid Radar Orange body + Crimson Red core (dBZ 35-50).
// - Risk 3 (Severe Storm): Radar Orange fringe + Crimson body + Burgundy core + Magenta peak (dBZ 50-60).
// - Risk 4 (Extreme / No Travel): Crimson fringe + Deep Violet body + Fuchsia core + White-hot eye (dBZ 60+).
const RADAR_TIERS: Record<number, RadarBand[]> = {
  1: [
    {
      radiusRatio: 1.0,
      fill: 'rgba(250, 204, 21, 0.35)', // Golden Yellow outer reflectivity
    },
    {
      radiusRatio: 0.55,
      fill: 'rgba(234, 179, 8, 0.75)', // Solid Gold moderate core
    },
  ],
  2: [
    {
      radiusRatio: 1.0,
      fill: 'rgba(251, 191, 36, 0.35)', // Amber / Warm Gold fringe
    },
    {
      radiusRatio: 0.65,
      fill: 'rgba(249, 115, 22, 0.74)', // Vivid Radar Orange storm body
    },
    {
      radiusRatio: 0.34,
      fill: 'rgba(220, 38, 38, 0.88)', // Deep Crimson severe center
    },
  ],
  3: [
    {
      radiusRatio: 1.0,
      fill: 'rgba(249, 115, 22, 0.38)', // Radar Orange fringe
    },
    {
      radiusRatio: 0.70,
      fill: 'rgba(220, 38, 38, 0.78)', // Intense Crimson storm body
    },
    {
      radiusRatio: 0.42,
      fill: 'rgba(153, 27, 27, 0.90)', // Dark Burgundy severe core
    },
    {
      radiusRatio: 0.20,
      fill: 'rgba(217, 70, 239, 0.95)', // Electric Magenta peak
    },
  ],
  4: [
    {
      radiusRatio: 1.0,
      fill: 'rgba(220, 38, 38, 0.42)', // Deep Crimson fringe
    },
    {
      radiusRatio: 0.72,
      fill: 'rgba(147, 51, 234, 0.82)', // Deep Violet / Purple storm body
    },
    {
      radiusRatio: 0.44,
      fill: 'rgba(192, 38, 211, 0.92)', // Vivid Fuchsia core
    },
    {
      radiusRatio: 0.22,
      fill: 'rgba(250, 232, 255, 0.98)', // White-Violet Supercell eye
    },
  ],
};

const MAX_RADAR_PASSES = 4;

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

      // Physical storm cell radius: ~42 miles (68,000 meters) footprint
      // Ensures adjacent corridor checkpoints continuously merge without dispersing
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const stormFootprintMeters = 68000;
      const radius = Math.min(
        maxScreenRadius,
        Math.max(26, Math.round(stormFootprintMeters / Math.max(metersPerPixel, 0.1)))
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

    // Multi-pass Doppler radar rendering:
    // Pass 0: Outer reflectivity envelopes (all active storm cells merge into a continuous corridor front)
    // Pass 1: Mid storm bodies (solid radar orange / gold reflectivity)
    // Pass 2: Severe cores (crimson red / burgundy centers)
    // Pass 3: Peak supercell eyes (magenta / white-hot peaks)
    // Solid stepped reflectivity bands without pen strokes for clean, authentic meteorological radar.
    for (let pass = 0; pass < MAX_RADAR_PASSES; pass++) {
      for (const cell of activeCells) {
        const band = RADAR_TIERS[cell.riskLevel]?.[pass];
        if (!band) continue;

        const bandRadius = Math.max(4, Math.round(cell.radius * band.radiusRatio));
        ctx.fillStyle = band.fill;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, bandRadius, 0, Math.PI * 2);
        ctx.fill();
      }
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
    // Clean digital Doppler weather radar with stepped reflectivity fills
    canvas.style.filter = 'none';
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
