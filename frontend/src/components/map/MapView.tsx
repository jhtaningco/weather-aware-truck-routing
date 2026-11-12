import { Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { PlanResponse } from '../../types/api';
import { CheckpointMarkers } from './CheckpointMarkers';
import { MapBoundsController } from './MapBoundsController';
import { MapLegend } from './MapLegend';
import { RouteLayers } from './RouteLayers';
import { WaypointMarkers } from './WaypointMarkers';

interface MapViewProps {
  plan: PlanResponse | null;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

const CARTO_POSITRON_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MapView: React.FC<MapViewProps> = ({
  plan,
  selectedRouteId,
  onSelectRoute,
}) => {
  const selectedRoute = plan?.routes.find((r) => r.id === selectedRouteId) || plan?.routes[0];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        '& .leaflet-container': {
          width: '100%',
          height: '100%',
          backgroundColor: '#F8FAFC',
          fontFamily: "'Outfit', sans-serif",
        },
        '& .leaflet-popup-content-wrapper': {
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(16, 24, 40, 0.15)',
          padding: '6px',
        },
        '& .leaflet-popup-content': {
          margin: '8px 10px',
          lineHeight: 1.4,
        },
        '& .leaflet-popup-tip': {
          boxShadow: '0 4px 12px rgba(16, 24, 40, 0.12)',
        },
      }}
    >
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution={CARTO_ATTRIBUTION}
          url={CARTO_POSITRON_URL}
          maxZoom={19}
        />

        {plan && (
          <>
            <MapBoundsController
              routes={plan.routes}
              selectedRouteId={selectedRouteId}
            />

            <RouteLayers
              routes={plan.routes}
              recommendedRouteId={plan.recommended_route_id}
              selectedRouteId={selectedRouteId}
              onSelectRoute={onSelectRoute}
            />

            <CheckpointMarkers
              selectedRoute={selectedRoute}
              loadLb={plan.inputs.load_lb}
            />

            <WaypointMarkers
              origin={plan.inputs.origin}
              destination={plan.inputs.destination}
            />
          </>
        )}
      </MapContainer>

      {/* Floating Legend */}
      {plan && <MapLegend />}
    </Box>
  );
};
