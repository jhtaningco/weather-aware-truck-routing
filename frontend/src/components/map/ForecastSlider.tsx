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
import React, { useEffect, useRef, useState } from 'react';
import { RISK_LEVELS, type RiskLevelOrdinal } from '../../types/risk';

interface ForecastSliderProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  startTime: string; // ISO-8601 UTC
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  isLoading?: boolean;
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
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const hourRef = useRef(currentHour);

  useEffect(() => {
    hourRef.current = currentHour;
  }, [currentHour]);

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
              label={currentHour === 0 ? 'Departure' : `+${currentHour}h forecast`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.675rem',
                fontWeight: 600,
                bgcolor: currentHour === 0 ? '#ECFDF3' : 'primaryTint',
                color: currentHour === 0 ? '#12B76A' : 'primary.main',
              }}
            />
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

      {/* Interactive 0-48h Slider */}
      <Box sx={{ px: 1.5, pt: 0.5 }}>
        <Slider
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
          Heatmap Risk:
        </Typography>
        {ORDINAL_LIST.map((ord) => {
          const spec = RISK_LEVELS[ord];
          return (
            <Box key={ord} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: spec.solid,
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
