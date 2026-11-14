import L from 'leaflet';
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { RouteOption } from '../../types/api';

interface TruckMarkerProps {
  route?: RouteOption;
  currentHour: number; // 0 to 48 hours from departure
  departAt?: string;   // ISO string
  loadLb?: number;
}

export const TruckMarker: React.FC<TruckMarkerProps> = ({
  route,
  currentHour,
  departAt,
  loadLb = 35000,
}) => {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const prevHourRef = useRef<number>(currentHour);
  const prevArrivedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!route || !route.checkpoints || route.checkpoints.length === 0 || !departAt) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const checkpoints = route.checkpoints;
    const depTime = new Date(departAt).getTime();
    const targetTime = depTime + Math.max(0, Math.min(48, currentHour)) * 3600 * 1000;

    const firstCp = checkpoints[0];
    const lastCp = checkpoints[checkpoints.length - 1];
    if (!firstCp || !lastCp) return;

    const firstTime = new Date(firstCp.eta).getTime();
    const lastTime = new Date(lastCp.eta).getTime();

    let lat: number;
    let lon: number;
    let mile: number;
    let statusText: string;
    let isArrived = false;

    if (targetTime <= firstTime) {
      lat = firstCp.lat;
      lon = firstCp.lon;
      mile = 0;
      statusText = '🚚 Departed Origin';
    } else if (targetTime >= lastTime) {
      lat = lastCp.lat;
      lon = lastCp.lon;
      mile = route.distance_mi;
      statusText = '🏁 Arrived at Destination';
      isArrived = true;
    } else {
      // Find bounding checkpoints by ETA
      let prev = firstCp;
      let next = lastCp;

      for (let i = 0; i < checkpoints.length - 1; i++) {
        const cpA = checkpoints[i];
        const cpB = checkpoints[i + 1];
        if (!cpA || !cpB) continue;

        const tA = new Date(cpA.eta).getTime();
        const tB = new Date(cpB.eta).getTime();

        if (targetTime >= tA && targetTime <= tB) {
          prev = cpA;
          next = cpB;
          break;
        }
      }

      const tA = new Date(prev.eta).getTime();
      const tB = new Date(next.eta).getTime();
      const span = Math.max(1, tB - tA);
      const alpha = Math.max(0, Math.min(1, (targetTime - tA) / span));

      lat = prev.lat + (next.lat - prev.lat) * alpha;
      lon = prev.lon + (next.lon - prev.lon) * alpha;
      mile = prev.mile + (next.mile - prev.mile) * alpha;
      statusText = `🚚 Mile ${Math.round(mile)} • In Transit`;
    }

    const prevHour = prevHourRef.current;
    prevHourRef.current = currentHour;
    // Sequential 1-hour playback step should glide smoothly via 60fps CSS transform transition
    const isSequentialStep = Math.abs(currentHour - prevHour) === 1;

    const iconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <!-- Status Pill -->
        <div class="truck-status-text" style="position: absolute; top: -26px; background: ${isArrived ? '#12B76A' : '#1D2939'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10.5px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-family: 'Outfit', sans-serif; border: 1.5px solid white;">
          ${statusText}
        </div>
        <!-- Truck Circle Badge -->
        <div style="background: ${isArrived ? '#12B76A' : '#465FFF'}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(70, 95, 255, 0.45); border: 2.5px solid white; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'custom-truck-location-marker',
      html: iconHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const popupHtml = `
      <div style="font-family: 'Outfit', sans-serif; font-size: 12px; line-height: 1.5; min-width: 200px;">
        <div style="font-weight: 700; color: #465FFF; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          🚚 Commercial Freight Truck
        </div>
        <div style="color: #344054;"><strong>Status:</strong> ${statusText}</div>
        <div style="color: #344054;"><strong>Current Progress:</strong> Mile ${mile.toFixed(1)} of ${route.distance_mi.toFixed(1)} mi</div>
        <div style="color: #344054;"><strong>Gross Load:</strong> ${loadLb.toLocaleString()} lb</div>
        <div style="color: #344054;"><strong>Assigned Route:</strong> ${route.label}</div>
      </div>
    `;

    if (!markerRef.current) {
      const marker = L.marker([lat, lon], {
        icon,
        zIndexOffset: 1000, // Highest priority marker
      }).addTo(map);

      marker.bindPopup(popupHtml, {
        minWidth: 220,
        maxWidth: 280,
        className: 'leaflet-truck-checkpoint-popup',
      });

      markerRef.current = marker;
      prevArrivedRef.current = isArrived;
    } else {
      const el = markerRef.current.getElement();
      if (el) {
        // Smooth 60fps glide during Play animation; instant snap during manual slider scrubbing
        el.style.transition = isSequentialStep ? 'transform 0.62s linear' : 'none';

        const statusEl = el.querySelector('.truck-status-text');
        if (statusEl) {
          statusEl.textContent = statusText;
          (statusEl as HTMLElement).style.background = isArrived ? '#12B76A' : '#1D2939';
        }
      }

      markerRef.current.setLatLng([lat, lon]);

      // Only recreate icon DOM if arrived state flipped to avoid interrupting CSS transform
      if (prevArrivedRef.current !== isArrived) {
        prevArrivedRef.current = isArrived;
        markerRef.current.setIcon(icon);
      }

      markerRef.current.setPopupContent(popupHtml);
    }
  }, [map, route, currentHour, departAt, loadLb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null;
};
