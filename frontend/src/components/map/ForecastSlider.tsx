import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Slider,
  Tooltip,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { HeatmapResponse } from '../../types/api';
import { RISK_LEVELS, type RiskLevelOrdinal } from '../../types/risk';

interface ForecastSliderProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  startTime: string; // ISO-8601 UTC
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  isLoading?: boolean;
  heatmap?: HeatmapResponse | null;
}

const SLIDER_MARKS = [
  { value: 0, label: '0h' },
  { value: 6, label: '6h' },
  { value: 12, label: '12h' },
  { value: 18, label: '18h' },
  { value: 24, label: '24h' },
  { value: 30, label: '30h' },
  { value: 36, label: '36h' },
  { value: 42, label: '42h' },
  { value: 48, label: '48h' },
];

const ORDINAL_LIST: RiskLevelOrdinal[] = [0, 1, 2, 3, 4];

export const ForecastSlider: React.FC<ForecastSliderProps> = ({
  currentHour,
  onHourChange,
  startTime,
  heatmapVisible,
  onToggleHeatmap,
  isLoading = false,
  heatmap,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const hourRef = useRef(currentHour);

  useEffect(() => {
    hourRef.current = currentHour;
  }, [currentHour]);

  // Compute peak risk along the corridor for each of the 49 hours
  const hourRiskSummary = useMemo(() => {
    if (!heatmap?.risk || heatmap.risk.length === 0) return [];
    const hours = heatmap.hours || 49;
    const summary: number[] = [];
    for (let h = 0; h < hours; h++) {
      let maxR = 0;
      for (let i = 0; i < heatmap.risk.length; i++) {
        const r = heatmap.risk[i]?.[h] ?? 0;
        if (r > maxR) maxR = r;
      }
      summary.push(maxR);
    }
    return summary;
  }, [heatmap]);

  // Play animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const next = hourRef.current >= 48 ? 0 : hourRef.current + 1;
      onHourChange(next);
    }, 650);

    return () => clearInterval(interval);
  }, [isPlaying, onHourChange]);

  const targetTime = dayjs(startTime).add(currentHour, 'hour');
  const formattedTime = targetTime.isValid()
    ? targetTime.format('ddd, MMM D • h:00 A')
    : `+${currentHour} Hours`;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: { xs: 'calc(100% - 32px)', sm: 580, md: 660 },
        p: { xs: 1.5, sm: 2 },
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'border',
        boxShadow: '0 8px 30px rgba(16, 24, 40, 0.15)',
      }}
    >
      {/* Top Header Row: Controls & Time Label */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isPlaying ? 'Pause timeline' : 'Play 48h timeline'}>
            <IconButton
              size="small"
              aria-label={isPlaying ? 'Pause 48-hour timeline animation' : 'Play 48-hour timeline animation'}
              onClick={() => setIsPlaying(!isPlaying)}
              sx={{
                bgcolor: isPlaying ? 'primary.main' : 'primaryTint',
                color: isPlaying ? 'white' : 'primary.main',
                '&:hover': {
                  bgcolor: isPlaying ? 'primary.dark' : 'primary.light',
                  color: 'white',
                },
              }}
            >
              {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset to Departure (0h)">
            <IconButton
              size="small"
              aria-label="Reset timeline to departure hour (0h)"
              onClick={() => {
                setIsPlaying(false);
                onHourChange(0);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <RestartAltRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>
              {formattedTime}
            </Typography>
            <Chip
              label={currentHour === 0 ? 'Departure' : `+${currentHour}h`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.675rem',
                fontWeight: 600,
                bgcolor: currentHour === 0 ? '#ECFDF3' : 'primaryTint',
                color: currentHour === 0 ? '#12B76A' : 'primary.main',
              }}
            />
            {/* Live Corridor Status Badge */}
            {(() => {
              const currentPeakRisk = hourRiskSummary[currentHour] ?? 0;
              const statusConfig: Record<number, { text: string; bg: string; color: string }> = {
                0: { text: '☀️ Clear Skies (No Hazards)', bg: '#ECFDF3', color: '#027A48' },
                1: { text: '🟡 Moderate Radar Active', bg: '#FEF0C7', color: '#B54708' },
                2: { text: '🟠 High Crosswinds Hazard', bg: '#FFEDD5', color: '#C2410C' },
                3: { text: '🔴 Severe Storm Front', bg: '#FEE4E2', color: '#B42318' },
                4: { text: '🛑 No-Travel Blizzard / Gale', bg: '#FDF2F8', color: '#9333EA' },
              };
              const conf = statusConfig[currentPeakRisk] ?? statusConfig[0]!;
              return (
                <Chip
                  label={conf.text}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.675rem',
                    fontWeight: 600,
                    bgcolor: conf.bg,
                    color: conf.color,
                  }}
                />
              );
            })()}
          </Box>
        </Box>

        {/* Heatmap Visibility Toggle Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={heatmapVisible ? 'Hide corridor weather heatmap' : 'Show corridor weather heatmap'}>
            <Chip
              icon={
                heatmapVisible ? (
                  <VisibilityOutlinedIcon sx={{ fontSize: '15px !important' }} />
                ) : (
                  <VisibilityOffOutlinedIcon sx={{ fontSize: '15px !important' }} />
                )
              }
              label={isLoading ? 'Loading Heatmap...' : heatmapVisible ? 'Heatmap On' : 'Heatmap Off'}
              size="small"
              onClick={onToggleHeatmap}
              sx={{
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.725rem',
                bgcolor: heatmapVisible ? 'primary.main' : '#F2F4F7',
                color: heatmapVisible ? 'white' : 'text.secondary',
                '& .MuiChip-icon': {
                  color: heatmapVisible ? 'white !important' : 'text.secondary !important',
                },
              }}
            />
          </Tooltip>
        </Box>
      </Box>

      {/* 48-Hour Corridor Weather Risk Sparkline */}
      {hourRiskSummary.length > 0 && (
        <Box sx={{ px: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              display: 'flex',
              height: 7,
              borderRadius: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
              backgroundColor: '#EAECF0',
              gap: '1px',
            }}
          >
            {hourRiskSummary.map((risk, idx) => {
              const spec = RISK_LEVELS[risk as RiskLevelOrdinal] ?? RISK_LEVELS[0];
              const isSelected = idx === currentHour;
              return (
                <Tooltip
                  key={idx}
                  title={`+${idx}h (${dayjs(startTime).add(idx, 'hour').format('ddd h A')}): Corridor Risk ${spec.label}`}
                  placement="top"
                >
                  <Box
                    onClick={() => {
                      setIsPlaying(false);
                      onHourChange(idx);
                    }}
                    sx={{
                      flex: 1,
                      backgroundColor: risk === 0 ? '#E4E7EC' : spec.solid,
                      opacity: isSelected ? 1.0 : 0.75,
                      borderTop: isSelected ? '2px solid #1D2939' : 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        opacity: 1.0,
                        transform: 'scaleY(1.4)',
                      },
                    }}
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Interactive 0-48h Slider */}
      <Box sx={{ px: 1.5, pt: 0.5 }}>
        <Slider
          aria-label="48-hour corridor weather forecast timeline"
          value={currentHour}
          min={0}
          max={48}
          step={1}
          marks={SLIDER_MARKS}
          onChange={(_, val) => {
            setIsPlaying(false);
            onHourChange(val as number);
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={(val) => `+${val}h`}
          sx={{
            color: 'primary.main',
            height: 6,
            '& .MuiSlider-thumb': {
              width: 18,
              height: 18,
              transition: '0.1s cubic-bezier(.47,1.64,.41,.8)',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(70, 95, 255, 0.16)',
              },
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.7rem',
              color: 'text.secondary',
              fontWeight: 500,
            },
          }}
        />
      </Box>

      {/* Helper animation prompt */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.675rem',
          display: 'block',
          textAlign: 'center',
          mb: 0.5,
        }}
      >
        {hourRiskSummary.some((r) => r > 0)
          ? '⚡ Heatmap corridor active: weather fronts develop ahead. Click ▶️ Play or drag slider to animate.'
          : '☀️ All clear: 0 hazards forecast across the corridor for the next 48 hours.'}
      </Typography>

      {/* Heatmap Mini Legend */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          pt: 1.25,
          borderTop: '1px solid #EAECF0',
          mt: 1,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.675rem', fontWeight: 600 }}>
          Heatmap Legend:
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: '1.5px solid #12B76A',
              bgcolor: 'transparent',
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.675rem' }}>
            Clear (Clean)
          </Typography>
        </Box>
        {ORDINAL_LIST.filter((ord) => ord > 0).map((ord) => {
          const spec = RISK_LEVELS[ord];
          return (
            <Box key={ord} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: ord === 4 ? '#9333EA' : spec.solid,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.675rem' }}>
                {spec.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};
