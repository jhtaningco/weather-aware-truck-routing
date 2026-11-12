import type { ApiError, GeocodeResult, HeatmapResponse, PlanRequest, PlanResponse } from '../types/api';

/** Geocoding autocomplete request hitting GET /api/geocode?q=... */
export async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const resp = await fetch(`/api/geocode?q=${encodeURIComponent(clean)}`, { signal });
  if (!resp.ok) {
    throw new Error(`Geocoding error (${resp.status})`);
  }
  return (await resp.json()) as GeocodeResult[];
}

/** Submit a trip plan request: POST /api/plans */
export async function createPlan(request: PlanRequest, signal?: AbortSignal): Promise<PlanResponse> {
  const resp = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!resp.ok) {
    let errMessage = `Error ${resp.status}`;
    try {
      const errData = (await resp.json()) as ApiError;
      if (errData.error?.message) {
        errMessage = errData.error.message;
        if (errData.error.details) {
          const detailStrings = Object.entries(errData.error.details).map(
            ([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`,
          );
          if (detailStrings.length > 0) {
            errMessage += ` (${detailStrings.join('; ')})`;
          }
        }
      }
    } catch {
      // Fallback to HTTP error
    }
    throw new Error(errMessage);
  }

  return (await resp.json()) as PlanResponse;
}

/** Fetch an existing plan by ID: GET /api/plans/<id> */
export async function fetchPlanById(id: string, signal?: AbortSignal): Promise<PlanResponse> {
  const resp = await fetch(`/api/plans/${encodeURIComponent(id)}`, { signal });
  if (!resp.ok) {
    throw new Error(`Plan fetch error (${resp.status})`);
  }
  return (await resp.json()) as PlanResponse;
}

/** Fetch 48-hour weather risk heatmap for a plan: GET /api/plans/<id>/heatmap */
export async function fetchHeatmap(planId: string, signal?: AbortSignal): Promise<HeatmapResponse> {
  const resp = await fetch(`/api/plans/${encodeURIComponent(planId)}/heatmap`, { signal });
  if (!resp.ok) {
    throw new Error(`Heatmap fetch error (${resp.status})`);
  }
  return (await resp.json()) as HeatmapResponse;
}
