import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import {
  Alert,
  AppBar,
  Box,
  Card,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { RiskChip } from './components/RiskChip';
import { TripForm } from './components/TripForm';
import { useCreatePlan } from './hooks/usePlan';
import type { PlanRequest, PlanResponse } from './types/api';
import type { RiskLevelOrdinal } from './types/risk';

export default function App() {
  const [currentPlan, setCurrentPlan] = useState<PlanResponse | null>(null);
  const { mutate: planTrip, isPending, error } = useCreatePlan();

  const handleTripSubmit = (request: PlanRequest) => {
    planTrip(request, {
      onSuccess: (data) => {
        setCurrentPlan(data);
      },
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Navigation Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'border',
          color: 'text.primary',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ height: 64, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <LocalShippingOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Spotter.AI Weather-Aware Routing
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Truck Navigation • Risk Classification • Forecast Heatmap
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <Chip
                label="HGV Driving Profile"
                size="small"
                sx={{ bgcolor: 'primaryTint', color: 'primary.main', fontWeight: 500 }}
              />
              <Chip
                label="Live Weather v1"
                size="small"
                sx={{ bgcolor: '#ECFDF3', color: '#12B76A', fontWeight: 500 }}
              />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <Container maxWidth="xl" disableGutters sx={{ height: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: 'stretch',
              minHeight: 'calc(100vh - 120px)',
            }}
          >
            {/* Left Sidebar Panel */}
            <Box
              sx={{
                width: { xs: '100%', md: 440 },
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {/* Trip Input Form Card */}
              <Card sx={{ p: { xs: 2.5, sm: 3 } }}>
                <TripForm
                  onSubmit={handleTripSubmit}
                  isLoading={isPending}
                  error={error ? error.message : null}
                />
              </Card>

              {/* Loading Skeletons */}
              {isPending && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Skeleton variant="text" width="60%" height={28} />
                    <Skeleton variant="rounded" height={80} />
                    <Skeleton variant="rounded" height={60} />
                    <Skeleton variant="rounded" height={60} />
                  </Stack>
                </Card>
              )}

              {/* Routes Overview Placeholder (Phase 4 -> Phase 5) */}
              {currentPlan && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">Generated Routes</Typography>
                      <Chip
                        label={`${currentPlan.routes.length} Available`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Alert severity="success" sx={{ borderRadius: 2 }}>
                      {currentPlan.recommendation.explanation}
                    </Alert>

                    <Stack spacing={1.5}>
                      {currentPlan.routes.map((r) => {
                        const maxRiskOrdinal = (r.summary.max_risk as RiskLevelOrdinal) || 0;
                        return (
                          <Paper
                            key={r.id}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              borderColor:
                                r.id === currentPlan.recommended_route_id ? 'primary.main' : 'border',
                              bgcolor:
                                r.id === currentPlan.recommended_route_id ? 'primaryTint' : 'background.paper',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {r.label}
                                  {r.id === currentPlan.recommended_route_id && (
                                    <Typography
                                      component="span"
                                      color="primary.main"
                                      sx={{ ml: 1, fontSize: '0.8rem', fontWeight: 600 }}
                                    >
                                      (Recommended)
                                    </Typography>
                                  )}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {r.distance_mi} mi • {Math.round(r.duration_s / 3600)}h{' '}
                                  {Math.round((r.duration_s % 3600) / 60)}m
                                </Typography>
                              </Box>
                              <RiskChip level={maxRiskOrdinal} />
                            </Box>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Stack>
                </Card>
              )}
            </Box>

            {/* Right Map View / Hero Container */}
            <Box
              sx={{
                flex: 1,
                minHeight: { xs: 450, md: 'auto' },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Card
                sx={{
                  flex: 1,
                  p: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: 'border',
                }}
              >
                <Stack spacing={2} sx={{ maxWidth: 460, textAlign: 'center', p: 4, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                      bgcolor: 'primaryTint',
                      color: 'primary.main',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <MapOutlinedIcon sx={{ fontSize: 36 }} />
                  </Box>
                  <Typography variant="h6">Map & Corridor Visualization</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {currentPlan
                      ? `Trip loaded: ${currentPlan.inputs.origin.label} to ${currentPlan.inputs.destination.label}. Map layers, checkpoints, and 48h forecast heatmap ready for Phase 5 & 6.`
                      : 'Submit a trip from the left panel to generate route options, checkpoints, and weather risk analysis.'}
                  </Typography>

                  {currentPlan && (
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
                      <Chip
                        icon={<RouteOutlinedIcon />}
                        label={`${currentPlan.routes.length} Routes Generated`}
                        size="small"
                      />
                      <Chip
                        label={`${currentPlan.routes[0]?.checkpoints.length ?? 0} Checkpoints`}
                        size="small"
                      />
                    </Box>
                  )}
                </Stack>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
