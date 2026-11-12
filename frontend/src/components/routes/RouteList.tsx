import { Stack, Typography, Box } from '@mui/material';
import React from 'react';
import type { PlanResponse } from '../../types/api';
import { RecommendationBanner } from './RecommendationBanner';
import { RouteCard } from './RouteCard';

interface RouteListProps {
  plan: PlanResponse;
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

export const ROUTE_COLORS: Record<number, string> = {
  0: '#465FFF', // Primary Brand (solid thick)
  1: '#475467', // Slate neutral (solid)
  2: '#0BA5EC', // Sky blue (dashed)
};

export const RouteList: React.FC<RouteListProps> = ({
  plan,
  selectedRouteId,
  onSelectRoute,
}) => {
  const recommendedRoute = plan.routes.find((r) => r.id === plan.recommended_route_id);

  return (
    <Stack spacing={2.5}>
      {/* Top Recommendation Banner */}
      <RecommendationBanner
        recommendation={plan.recommendation}
        recommendedRoute={recommendedRoute}
      />

      {/* Route Cards Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Available Routes ({plan.routes.length})
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Click card to inspect checkpoints
        </Typography>
      </Box>

      {/* Route Cards Stack */}
      <Stack spacing={2}>
        {plan.routes.map((route, idx) => {
          const isRecommended = route.id === plan.recommended_route_id;
          const isSelected = route.id === selectedRouteId;
          const accentColor = isRecommended ? ROUTE_COLORS[0] : (ROUTE_COLORS[idx] || '#667085');

          return (
            <RouteCard
              key={route.id}
              route={route}
              isRecommended={isRecommended}
              isSelected={isSelected}
              onSelect={onSelectRoute}
              accentColor={accentColor}
            />
          );
        })}
      </Stack>
    </Stack>
  );
};
