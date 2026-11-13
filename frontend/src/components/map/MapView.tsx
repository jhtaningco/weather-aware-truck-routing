import { Box } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useHeatmap } from '../../hooks/usePlan';
import type { PlanResponse } from '../../types/api';
import { CheckpointMarkers } from './CheckpointMarkers';
import { ForecastSlider } from './ForecastSlider';
import { HeatmapLayer } from './HeatmapLayer';
import { MapBoundsController } from './MapBoundsController';
import { MapLegend } from './MapLegend';
import { RecenterButton } from './RecenterButton';
import { RouteLayers } from './RouteLayers';
import { WaypointMarkers } from './WaypointMarkers';

interface MapViewProps {
  plan: PlanResponse | null;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

const ESRI_LIGHT_GRAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_REFERENCE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const MAP_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ, OpenStreetMap contributors';

export const MapView: React.FC<MapViewProps> = ({
  plan,
  selectedRouteId,
  onSelectRoute,
}) => {
  const [forecastHour, setForecastHour] = useState<number>(0);
  const [heatmapVisible, setHeatmapVisible] = useState<boolean>(true);

  // Fetch 48-hour heatmap for current plan
  const { data: heatmap, isLoading: isHeatmapLoading } = useHeatmap(plan?.id);

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
        '& .leaflet-control-zoom': {
          border: 'none !important',
          boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12) !important',
          borderRadius: '12px !important',
          overflow: 'hidden',
          mt: 2,
          ml: 2,
        },
        '& .leaflet-control-zoom a': {
          backgroundColor: '#FFFFFF !important',
          color: '#344054 !important',
          width: '34px !important',
          height: '34px !important',
          lineHeight: '34px !important',
          fontSize: '18px !important',
          borderBottom: '1px solid #F2F4F7 !important',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: '#F8F9FA !important',
            color: '#465FFF !important',
          },
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
          attribution={MAP_ATTRIBUTION}
          url={ESRI_LIGHT_GRAY_URL}
          maxNativeZoom={16}
          maxZoom={19}
        />
        <TileLayer
          url={ESRI_REFERENCE_URL}
          maxNativeZoom={16}
          maxZoom={19}
        />

        {plan && (
          <>
            <MapBoundsController
              routes={plan.routes}
              selectedRouteId={selectedRouteId}
            />

            <RecenterButton
              routes={plan.routes}
              selectedRouteId={selectedRouteId}
            />

            <HeatmapLayer
              heatmap={heatmap}
              currentHour={forecastHour}
              visible={heatmapVisible}
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

      {/* 0-48h Forecast Timeline Slider */}
      {plan && (
        <ForecastSlider
          currentHour={forecastHour}
          onHourChange={setForecastHour}
          startTime={plan.inputs.depart_at}
          heatmapVisible={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible(!heatmapVisible)}
          isLoading={isHeatmapLoading}
          heatmap={heatmap}
        />
      )}
    </Box>
  );
};
