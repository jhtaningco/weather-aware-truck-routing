import { useMutation, useQuery } from '@tanstack/react-query';
import { createPlan, fetchGeocode, fetchHeatmap, fetchPlanById } from '../api/client';
import type { PlanRequest } from '../types/api';

/** Hook to execute trip plan creation */
export function useCreatePlan() {
  return useMutation({
    mutationFn: (request: PlanRequest) => createPlan(request),
  });
}

/** Hook to fetch 48-hour corridor weather risk heatmap */
export function useHeatmap(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['heatmap', planId],
    queryFn: ({ signal }) => (planId ? fetchHeatmap(planId, signal) : null),
    enabled: Boolean(planId),
    staleTime: Infinity, // Heatmap for a plan is fixed for 48 hours from departure
  });
}

/** Hook to fetch an existing plan by ID */
export function usePlan(id: string | null) {
  return useQuery({
    queryKey: ['plan', id],
    queryFn: ({ signal }) => (id ? fetchPlanById(id, signal) : null),
    enabled: Boolean(id),
  });
}

/** Hook for debounced geocode queries */
export function useGeocode(query: string) {
  return useQuery({
    queryKey: ['geocode', query.trim().toLowerCase()],
    queryFn: ({ signal }) => fetchGeocode(query, signal),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 60 * 60, // 1 hour client cache
  });
}
