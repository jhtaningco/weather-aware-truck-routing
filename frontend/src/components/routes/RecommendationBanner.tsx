import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Box, Paper, Typography } from '@mui/material';
import React from 'react';
import type { RecommendationInfo, RouteOption } from '../../types/api';

interface RecommendationBannerProps {
  recommendation: RecommendationInfo;
  recommendedRoute?: RouteOption;
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  recommendation,
  recommendedRoute,
}) => {
  const isAllBlocked = recommendation.all_blocked;
  const isRecommendedBlocked = recommendation.recommended_blocked;

  if (isAllBlocked) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          backgroundColor: '#FDF2F2',
          border: '1px solid #F87171',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <BlockIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#991B1B' }}>
              Do Not Depart — All Routes Blocked
            </Typography>
            <Typography variant="body2" sx={{ color: '#7F1D1D', mt: 0.5, lineHeight: 1.5 }}>
              {recommendation.explanation}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, color: '#991B1B', fontWeight: 500 }}
            >
              Dangerous conditions (winds &ge; 55 mph or heavy precipitation) exceed safe commercial truck operating thresholds.
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  if (isRecommendedBlocked) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          backgroundColor: '#FFFBEB',
          border: '1px solid #FCD34D',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <WarningAmberOutlinedIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#92400E' }}>
              Warning: Selected Route Contains No-Travel Segments
            </Typography>
            <Typography variant="body2" sx={{ color: '#78350F', mt: 0.5, lineHeight: 1.5 }}>
              {recommendation.explanation}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        backgroundColor: 'primaryTint',
        border: '1px solid',
        borderColor: 'primary.light',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            backgroundColor: 'primary.main',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircleOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Recommended: {recommendedRoute?.label || 'Optimal Route'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>
            {recommendation.explanation}
          </Typography>

          {recommendation.corridor_note && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mt: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'border',
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {recommendation.corridor_note}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
