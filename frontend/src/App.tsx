import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import NavigationOutlinedIcon from '@mui/icons-material/NavigationOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import {
  Alert,
  AppBar,
  Box,
  Card,
  Chip,
  Container,
  Skeleton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { MapView } from './components/map/MapView';
import { RouteList } from './components/routes/RouteList';
import { TripForm } from './components/TripForm';
import { useCreatePlan } from './hooks/usePlan';
import type { PlanRequest, PlanResponse } from './types/api';

export default function App() {
  const [currentPlan, setCurrentPlan] = useState<PlanResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const { mutate: planTrip, isPending, error } = useCreatePlan();

  const handleTripSubmit = (request: PlanRequest) => {
    planTrip(request, {
      onSuccess: (data) => {
        setCurrentPlan(data);
        setSelectedRouteId(data.recommended_route_id);
      },
    });
  };

  const selectedRoute = currentPlan?.routes.find((r) => r.id === selectedRouteId) || currentPlan?.routes[0];

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
                  Commercial Truck Navigation • Checkpoint Risk • Corridor Analysis
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              {currentPlan && selectedRoute && (
                <Chip
                  icon={<NavigationOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${currentPlan.inputs.origin.label.split(',')[0]} → ${currentPlan.inputs.destination.label.split(',')[0]} (${selectedRoute.distance_mi.toFixed(0)} mi)`}
                  size="small"
                  sx={{
                    bgcolor: 'primaryTint',
                    color: 'primary.main',
                    fontWeight: 600,
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />
              )}
              <Chip
                label="HGV Driving Profile"
                size="small"
                sx={{ bgcolor: '#F2F4F7', color: 'text.secondary', fontWeight: 500 }}
              />
              <Chip
                label="Live Weather v1"
                size="small"
                sx={{ bgcolor: '#ECFDF3', color: '#12B76A', fontWeight: 500 }}
              />

              {currentPlan && (
                <Tooltip title={sidebarOpen ? 'Expand map full-width' : 'Show route planning panel'}>
                  <Chip
                    icon={
                      sidebarOpen ? (
                        <FullscreenOutlinedIcon sx={{ fontSize: '16px !important' }} />
                      ) : (
                        <ViewSidebarOutlinedIcon sx={{ fontSize: '16px !important' }} />
                      )
                    }
                    label={sidebarOpen ? 'Full Map' : 'Show Plans'}
                    size="small"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: sidebarOpen ? '#F2F4F7' : 'primaryTint',
                      color: sidebarOpen ? 'text.secondary' : 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      '&:hover': {
                        bgcolor: 'primaryTint',
                        color: 'primary.main',
                      },
                    }}
                  />
                </Tooltip>
              )}
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
                width: { xs: '100%', md: 460 },
                flexShrink: 0,
                display: sidebarOpen ? 'flex' : 'none',
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

              {/* Error Message if mutation fails */}
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error.message || 'Unable to generate route options. Please verify input locations and try again.'}
                </Alert>
              )}

              {/* Loading Skeletons */}
              {isPending && (
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Skeleton variant="text" width="60%" height={28} />
                    <Skeleton variant="rounded" height={100} />
                    <Skeleton variant="rounded" height={140} />
                    <Skeleton variant="rounded" height={140} />
                  </Stack>
                </Card>
              )}

              {/* Route Options List & Summaries */}
              {currentPlan && !isPending && (
                <RouteList
                  plan={currentPlan}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                />
              )}
            </Box>

            {/* Right Map View Container */}
            <Box
              sx={{
                flex: 1,
                minHeight: { xs: 500, md: 'calc(100vh - 110px)' },
                height: { xs: 550, md: 'calc(100vh - 110px)' },
                position: { xs: 'static', md: 'sticky' },
                top: 80,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Card
                sx={{
                  flex: 1,
                  p: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid',
                  borderColor: 'border',
                  boxShadow: '0 1px 3px rgba(16, 24, 40, 0.06)',
                  borderRadius: '16px',
                  display: 'flex',
                }}
              >
                <MapView
                  key={currentPlan?.id ?? 'initial'}
                  plan={currentPlan}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                />

                {/* Floating Show Sidebar Pill when map is full-width */}
                {!sidebarOpen && currentPlan && (
                  <Chip
                    icon={<ViewSidebarOutlinedIcon sx={{ fontSize: '15px !important' }} />}
                    label="Show Routes"
                    size="small"
                    onClick={() => setSidebarOpen(true)}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 60,
                      zIndex: 1000,
                      cursor: 'pointer',
                      bgcolor: 'white',
                      boxShadow: '0 4px 16px rgba(16, 24, 40, 0.14)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      border: '1px solid #E4E7EC',
                      '&:hover': {
                        bgcolor: 'primaryTint',
                        color: 'primary.main',
                      },
                    }}
                  />
                )}

                {/* Initial Blank Map Prompt Overlay */}
                {!currentPlan && !isPending && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1000,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #E4E7EC',
                      boxShadow: '0 4px 16px rgba(16, 24, 40, 0.1)',
                      borderRadius: 3,
                      px: 3,
                      py: 1.5,
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Enter origin, destination, and departure time to view route options & weather risk
                    </Typography>
                  </Box>
                )}
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
