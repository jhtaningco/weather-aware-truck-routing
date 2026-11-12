import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import ScaleOutlinedIcon from '@mui/icons-material/ScaleOutlined';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import React, { useEffect, useState } from 'react';
import { fetchGeocode } from '../api/client';
import type { GeocodeResult, LocationPoint, PlanRequest } from '../types/api';

interface TripFormProps {
  onSubmit: (params: PlanRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

const DEFAULT_ORIGIN: LocationPoint = {
  label: 'Dallas, TX, United States',
  lat: 32.7767,
  lon: -96.797,
};

const DEFAULT_DESTINATION: LocationPoint = {
  label: 'Denver, CO, United States',
  lat: 39.7392,
  lon: -104.9903,
};

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading, error }) => {
  const [origin, setOrigin] = useState<LocationPoint | null>(DEFAULT_ORIGIN);
  const [originInput, setOriginInput] = useState('Dallas, TX');
  const [originOptions, setOriginOptions] = useState<GeocodeResult[]>([]);
  const [originLoading, setOriginLoading] = useState(false);

  const [destination, setDestination] = useState<LocationPoint | null>(DEFAULT_DESTINATION);
  const [destInput, setDestInput] = useState('Denver, CO');
  const [destOptions, setDestOptions] = useState<GeocodeResult[]>([]);
  const [destLoading, setDestLoading] = useState(false);

  const [departTime, setDepartTime] = useState<Dayjs | null>(dayjs().add(2, 'hour'));
  const [loadLb, setLoadLb] = useState<number>(35000);
  const [intervalMi, setIntervalMi] = useState<10 | 25 | 50>(25);

  // Debounced geocoding for Origin
  useEffect(() => {
    if (!originInput || originInput.trim().length < 2) {
      return;
    }
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setOriginLoading(true);
      try {
        const results = await fetchGeocode(originInput);
        if (!isCancelled) {
          setOriginOptions(results);
        }
      } catch {
        // Handled silently for autocomplete suggestions
      } finally {
        if (!isCancelled) {
          setOriginLoading(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [originInput]);

  // Debounced geocoding for Destination
  useEffect(() => {
    if (!destInput || destInput.trim().length < 2) {
      return;
    }
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setDestLoading(true);
      try {
        const results = await fetchGeocode(destInput);
        if (!isCancelled) {
          setDestOptions(results);
        }
      } catch {
        // Handled silently for autocomplete suggestions
      } finally {
        if (!isCancelled) {
          setDestLoading(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [destInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !departTime) return;

    onSubmit({
      origin,
      destination,
      depart_at: departTime.toISOString(),
      load_lb: Number(loadLb) || 0,
      interval_mi: intervalMi,
    });
  };

  const isFormValid =
    Boolean(origin) &&
    Boolean(destination) &&
    Boolean(departTime) &&
    loadLb >= 0 &&
    loadLb <= 120000;

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

        {/* Origin Autocomplete */}
        <Autocomplete
          value={origin}
          onChange={(_, val) => setOrigin(val)}
          inputValue={originInput}
          onInputChange={(_, val) => {
            setOriginInput(val);
            if (!val || val.trim().length < 2) {
              setOriginOptions([]);
            }
          }}
          options={originOptions}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(opt, val) => opt.lat === val.lat && opt.lon === val.lon}
          loading={originLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Origin City or Address"
              placeholder="e.g. Dallas, TX"
              required
              fullWidth
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps?.input,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <LocationOnOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      </InputAdornment>
                      {params.slotProps?.input?.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {originLoading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.slotProps?.input?.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />

        {/* Destination Autocomplete */}
        <Autocomplete
          value={destination}
          onChange={(_, val) => setDestination(val)}
          inputValue={destInput}
          onInputChange={(_, val) => {
            setDestInput(val);
            if (!val || val.trim().length < 2) {
              setDestOptions([]);
            }
          }}
          options={destOptions}
          getOptionLabel={(opt) => opt.label}
          isOptionEqualToValue={(opt, val) => opt.lat === val.lat && opt.lon === val.lon}
          loading={destLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Destination City or Address"
              placeholder="e.g. Denver, CO"
              required
              fullWidth
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps?.input,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <NavigationOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      </InputAdornment>
                      {params.slotProps?.input?.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {destLoading ? <CircularProgress color="inherit" size={18} /> : null}
                      {params.slotProps?.input?.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />

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
          onChange={(e) => setLoadLb(Number(e.target.value))}
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
          sx={{ height: 48, mt: 1 }}
        >
          {isLoading ? (
            <Stack sx={{ flexDirection: 'row', alignItems: 'center' }} spacing={1.5}>
              <CircularProgress size={20} color="inherit" />
              <span>Analyzing Weather & Routes...</span>
            </Stack>
          ) : (
            'Find Safest Route'
          )}
        </Button>
      </Stack>
    </Box>
  );
};
