export interface HealthResponse {
  status: string;
  version: string;
  cache_backend: string;
}

/** Fetch the API liveness payload. Throws with a readable message on failure. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal });
  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
