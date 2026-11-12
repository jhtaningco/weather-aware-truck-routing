import { Alert, Box, Card, Skeleton, Stack, Typography } from '@mui/material';
import { useHealth } from './hooks/useHealth';

export default function App() {
  const { data, error, isPending } = useHealth();

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 480, p: 3, borderRadius: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Weather-Aware Truck Routing</Typography>
          {isPending && <Skeleton variant="rounded" height={48} />}
          {error && <Alert severity="error">Cannot reach the API: {error.message}</Alert>}
          {data && (
            <Alert severity="success">
              API {data.status} (v{data.version}, cache: {data.cache_backend})
            </Alert>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
