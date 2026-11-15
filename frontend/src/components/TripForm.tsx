import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import ScaleOutlinedIcon from '@mui/icons-material/ScaleOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import React, { useState } from 'react';
import type { LocationPoint, PlanRequest } from '../types/api';

interface TripFormProps {
  onSubmit: (params: PlanRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

export const AVAILABLE_LOCATIONS: LocationPoint[] = [
  { label: 'Dallas, TX, United States', lat: 32.7767, lon: -96.797 },
  { label: 'Denver, CO, United States', lat: 39.7392, lon: -104.9903 },
  { label: 'Chicago, IL, United States', lat: 41.8781, lon: -87.6298 },
  { label: 'Atlanta, GA, United States', lat: 33.749, lon: -84.388 },
  { label: 'Los Angeles, CA, United States', lat: 34.0522, lon: -118.2437 },
  { label: 'Houston, TX, United States', lat: 29.7604, lon: -95.3698 },
  { label: 'Phoenix, AZ, United States', lat: 33.4484, lon: -112.074 },
  { label: 'Seattle, WA, United States', lat: 47.6062, lon: -122.3321 },
  { label: 'Miami, FL, United States', lat: 25.7617, lon: -80.1918 },
  { label: 'New York, NY, United States', lat: 40.7128, lon: -74.006 },
];

const DEFAULT_ORIGIN: LocationPoint = AVAILABLE_LOCATIONS[0] as LocationPoint;
const DEFAULT_DESTINATION: LocationPoint = AVAILABLE_LOCATIONS[1] as LocationPoint;

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading, error }) => {
  const [origin, setOrigin] = useState<LocationPoint | null>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<LocationPoint | null>(DEFAULT_DESTINATION);
  const [departTime, setDepartTime] = useState<Dayjs | null>(dayjs().add(2, 'hour'));
  const [loadLb, setLoadLb] = useState<number | ''>(35000);
  const [intervalMi, setIntervalMi] = useState<10 | 25 | 50>(25);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !departTime) return;

    onSubmit({
      origin,
      destination,
      depart_at: departTime.toISOString(),
      load_lb: typeof loadLb === 'number' ? loadLb : Number(loadLb) || 0,
      interval_mi: intervalMi,
    });
  };

  const isSameLocation =
    Boolean(origin) &&
    Boolean(destination) &&
    origin?.lat === destination?.lat &&
    origin?.lon === destination?.lon;

  const isFormValid =
    Boolean(origin) &&
    Boolean(destination) &&
    Boolean(departTime) &&
    !isSameLocation &&
    loadLb !== '' &&
    !Number.isNaN(Number(loadLb)) &&
    Number(loadLb) >= 0 &&
    Number(loadLb) <= 120000;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
            Plan Truck Route
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Weather-aware route optimization, risk classification, and checkpoints.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {isSameLocation && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Origin and destination must be different locations.
          </Alert>
        )}

        {/* Origin Dropdown */}
        <TextField
          select
          label="Origin City or Address"
          value={origin?.label || ''}
          onChange={(e) => {
            const found = AVAILABLE_LOCATIONS.find((loc) => loc.label === e.target.value);
            if (found) setOrigin(found);
          }}
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOnOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        >
          {AVAILABLE_LOCATIONS.map((loc) => (
            <MenuItem key={loc.label} value={loc.label}>
              {loc.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Destination Dropdown */}
        <TextField
          select
          label="Destination City or Address"
          value={destination?.label || ''}
          onChange={(e) => {
            const found = AVAILABLE_LOCATIONS.find((loc) => loc.label === e.target.value);
            if (found) setDestination(found);
          }}
          required
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <NavigationOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        >
          {AVAILABLE_LOCATIONS.map((loc) => (
            <MenuItem key={loc.label} value={loc.label}>
              {loc.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Departure Date/Time Picker */}
        <DateTimePicker
          label="Departure Date & Time (Local)"
          value={departTime}
          onChange={(newVal) => setDepartTime(newVal)}
          disablePast
          slotProps={{
            textField: {
              fullWidth: true,
              helperText: `Timezone: ${dayjs().format('Z')} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
            },
          }}
        />

        {/* Load Weight */}
        <TextField
          label="Gross Vehicle / Load Weight"
          type="number"
          value={loadLb}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              setLoadLb('');
            } else {
              const num = Number(val);
              setLoadLb(Number.isNaN(num) ? '' : num);
            }
          }}
          onFocus={(e) => e.target.select()}
          fullWidth
          required
          helperText="Load rules escalate wind risk at >30k lb and >40k lb."
          slotProps={{
            htmlInput: { min: 0, max: 120000, step: 1000 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <ScaleOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: <InputAdornment position="end">lb</InputAdornment>,
            },
          }}
        />

        {/* Sampling Interval Toggle */}
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mb: 1 }}
          >
            Checkpoint Weather Sampling Interval
          </Typography>
          <ToggleButtonGroup
            value={intervalMi}
            exclusive
            onChange={(_, val) => val && setIntervalMi(val)}
            fullWidth
            aria-label="checkpoint interval"
          >
            <ToggleButton value={10}>10 miles</ToggleButton>
            <ToggleButton value={25}>25 miles</ToggleButton>
            <ToggleButton value={50}>50 miles</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isFormValid || isLoading}
          fullWidth
          sx={{
            height: 48,
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                lineHeight: 1,
              }}
            >
              <CircularProgress
                size={18}
                color="inherit"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <Typography
                component="span"
                sx={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Analyzing Weather & Routes...
              </Typography>
            </Box>
          ) : (
            'Find Safest Route'
          )}
        </Button>
      </Stack>
    </Box>
  );
};
