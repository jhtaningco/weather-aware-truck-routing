import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined';
import { IconButton, Tooltip } from '@mui/material';
import L from 'leaflet';
import React from 'react';
import { useMap } from 'react-leaflet';
import type { RouteOption } from '../../types/api';

interface RecenterButtonProps {
  routes: RouteOption[];
  selectedRouteId: string;
}

export const RecenterButton: React.FC<RecenterButtonProps> = ({
  routes,
  selectedRouteId,
}) => {
  const map = useMap();

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!routes || routes.length === 0) return;

    const targetRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (!targetRoute || targetRoute.geometry.coordinates.length === 0) return;

    const latLngs = targetRoute.geometry.coordinates.map(
      ([lon, lat]) => [lat, lon] as [number, number],
    );

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
        animate: true,
      });
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 94,
        left: 16,
        zIndex: 1000,
      }}
    >
      <Tooltip title="Fit corridor to screen" placement="right">
        <IconButton
          size="small"
          aria-label="Fit corridor routes to screen"
          onClick={handleRecenter}
          sx={{
            bgcolor: '#FFFFFF',
            color: '#344054',
            boxShadow: '0 4px 16px rgba(16, 24, 40, 0.12)',
            borderRadius: '10px',
            width: 34,
            height: 34,
            border: '1px solid #E4E7EC',
            '&:hover': {
              bgcolor: '#F8F9FA',
              color: 'primary.main',
            },
          }}
        >
          <CenterFocusStrongOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
    </div>
  );
};
