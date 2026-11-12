import { Box, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { RISK_LEVELS, type RiskLevelKey, type RiskLevelOrdinal } from '../../types/risk';

interface StackedRiskBarProps {
  milesByRisk: Record<RiskLevelKey, number>;
  totalDistanceMi: number;
  height?: number;
}

const ORDERED_LEVELS: { key: RiskLevelKey; ordinal: RiskLevelOrdinal }[] = [
  { key: 'low', ordinal: 0 },
  { key: 'moderate', ordinal: 1 },
  { key: 'high', ordinal: 2 },
  { key: 'severe', ordinal: 3 },
  { key: 'no_travel', ordinal: 4 },
];

export const StackedRiskBar: React.FC<StackedRiskBarProps> = ({
  milesByRisk,
  totalDistanceMi,
  height = 8,
}) => {
  const safeTotal = totalDistanceMi > 0 ? totalDistanceMi : 1;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Progress Bar Container */}
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height,
          borderRadius: `${height / 2}px`,
          overflow: 'hidden',
          backgroundColor: '#EAECF0',
        }}
      >
        {ORDERED_LEVELS.map(({ key, ordinal }) => {
          const miles = milesByRisk[key] || 0;
          if (miles <= 0.001) return null;
          const pct = Math.max((miles / safeTotal) * 100, 0.5);
          const spec = RISK_LEVELS[ordinal];

          return (
            <Tooltip
              key={key}
              title={`${spec.label}: ${miles.toFixed(1)} mi (${pct.toFixed(0)}%)`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: spec.solid,
                  transition: 'width 0.3s ease',
                  '&:hover': {
                    opacity: 0.85,
                  },
                }}
              />
            </Tooltip>
          );
        })}
      </Box>

      {/* Numerical breakdown chips below */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          mt: 1,
          alignItems: 'center',
        }}
      >
        {ORDERED_LEVELS.map(({ key, ordinal }) => {
          const miles = milesByRisk[key] || 0;
          if (miles <= 0.05) return null;
          const spec = RISK_LEVELS[ordinal];

          return (
            <Box
              key={key}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: spec.solid,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.725rem',
                  fontWeight: 500,
                }}
              >
                {spec.label}: {miles.toFixed(1)} mi
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
