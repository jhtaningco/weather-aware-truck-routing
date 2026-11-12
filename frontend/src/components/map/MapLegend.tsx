import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { Box, Paper, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import { RISK_LEVELS, type RiskLevelOrdinal } from '../../types/risk';

const ORDINAL_LIST: RiskLevelOrdinal[] = [0, 1, 2, 3, 4];

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        p: collapsed ? 1 : 1.75,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(6px)',
        border: '1px solid',
        borderColor: 'border',
        maxWidth: 220,
        boxShadow: '0 4px 14px rgba(16, 24, 40, 0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      <Box
        onClick={() => setCollapsed(!collapsed)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LayersOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Map Legend
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 500 }}
        >
          {collapsed ? 'Show' : 'Hide'}
        </Typography>
      </Box>

      {!collapsed && (
        <Stack spacing={1.5} sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #EAECF0' }}>
          {/* Routes Section */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.675rem', textTransform: 'uppercase' }}
            >
              Route Options
            </Typography>
            <Stack spacing={0.6} sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 4, backgroundColor: '#465FFF', borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.primary' }}>
                  Recommended
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 20, height: 3, backgroundColor: '#475467', borderRadius: 1 }} />
                <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.secondary' }}>
                  Alternative 1
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 0,
                    borderTop: '3px dashed #0BA5EC',
                  }}
                />
                <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.secondary' }}>
                  Alternative 2
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Risk Level Checkpoints Section */}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.675rem', textTransform: 'uppercase' }}
            >
              Checkpoint Risk
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {ORDINAL_LIST.map((ord) => {
                const spec = RISK_LEVELS[ord];
                return (
                  <Box key={ord} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: spec.solid,
                        border: '1.5px solid white',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.725rem', color: 'text.primary' }}>
                      {spec.label}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      )}
    </Paper>
  );
};
