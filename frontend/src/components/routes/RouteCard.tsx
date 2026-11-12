import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import React from 'react';
import type { RouteOption } from '../../types/api';
import { avgRiskToOrdinal } from '../../types/risk';
import { formatAvgRisk, formatDistance, formatDuration, formatETA } from '../../utils/formatters';
import { RiskChip } from '../RiskChip';
import { StackedRiskBar } from './StackedRiskBar';

interface RouteCardProps {
  route: RouteOption;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: (routeId: string) => void;
  accentColor?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isRecommended,
  isSelected,
  onSelect,
  accentColor = '#465FFF',
}) => {
  const avgOrdinal = avgRiskToOrdinal(route.summary.avg_risk);

  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Select ${route.label}`}
      onClick={() => onSelect(route.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(route.id);
        }
      }}
      sx={{
        p: 2.5,
        borderRadius: '16px',
        cursor: 'pointer',
        border: '1.5px solid',
        borderColor: isSelected ? 'primary.main' : 'border',
        backgroundColor: isSelected ? 'rgba(70, 95, 255, 0.03)' : 'background.paper',
        boxShadow: isSelected
          ? '0 4px 16px rgba(70, 95, 255, 0.12), 0 1px 3px rgba(16, 24, 40, 0.05)'
          : '0 1px 3px rgba(16, 24, 40, 0.05)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: isSelected ? 'primary.main' : 'primary.light',
          boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
        },
        '&:focus-visible': {
          outline: '2px solid #465FFF',
          outlineOffset: '2px',
        },
      }}
    >
      <Stack spacing={1.75}>
        {/* Top Header: Route Title + Badges */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: accentColor,
                flexShrink: 0,
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {route.label}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.75, alignItems: 'center' }}>
            {isRecommended && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                label="Recommended"
                size="small"
                sx={{
                  bgcolor: 'primaryTint',
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.725rem',
                  border: '1px solid',
                  borderColor: 'primary.light',
                }}
              />
            )}
            {route.summary.travel_blocked && (
              <Chip
                icon={<BlockIcon sx={{ fontSize: '14px !important', color: '#7A1F1F !important' }} />}
                label="No Travel"
                size="small"
                sx={{
                  bgcolor: '#FEE2E2',
                  color: '#7A1F1F',
                  fontWeight: 600,
                  fontSize: '0.725rem',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Metric Badges / Stats Row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            p: 1.5,
            borderRadius: '10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #EEF2F6',
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
              Distance
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatDistance(route.distance_mi)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
              Duration
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatDuration(route.duration_s)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
              Est. Arrival
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatETA(route.arrival_eta)}
            </Typography>
          </Box>
        </Box>

        {/* Average Risk & Risk Bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Weather Risk Corridor
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Avg {formatAvgRisk(route.summary.avg_risk)}
              </Typography>
              <RiskChip level={avgOrdinal} />
            </Box>
          </Box>

          <StackedRiskBar
            milesByRisk={route.summary.miles_by_risk}
            totalDistanceMi={route.distance_mi}
          />
        </Box>

        {/* Selection Indicator Footer */}
        {isSelected && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pt: 0.5 }}>
            <NavigationOutlinedIcon sx={{ fontSize: 15, color: 'primary.main' }} />
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Active Route Shown on Map
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
