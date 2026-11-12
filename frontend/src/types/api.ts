import type { RiskLevelKey, RiskLevelOrdinal } from './risk';

export interface LocationPoint {
  label: string;
  lat: number;
  lon: number;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

export interface PlanRequest {
  origin: LocationPoint;
  destination: LocationPoint;
  depart_at: string; // ISO-8601 with timezone offset
  load_lb: number;
  interval_mi: 10 | 25 | 50;
}

export interface CheckpointWeather {
  wind_mph: number;
  gust_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
}

export interface CheckpointRisk {
  level: RiskLevelOrdinal;
  level_name: string;
  wind: RiskLevelOrdinal;
  rain: RiskLevelOrdinal;
  snow: RiskLevelOrdinal;
  load_escalated: boolean;
  drivers: string[];
}

export interface Checkpoint {
  index: number;
  lat: number;
  lon: number;
  mile: number;
  eta: string;
  weather: CheckpointWeather;
  risk: CheckpointRisk;
}

export interface RouteSummary {
  miles_by_risk: Record<RiskLevelKey, number>;
  avg_risk: number;
  max_risk: number;
  travel_blocked: boolean;
  rank: number;
  reasons: string[];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lon, lat] per GeoJSON spec
}

export interface RouteOption {
  id: string;
  label: string;
  distance_mi: number;
  duration_s: number;
  arrival_eta: string;
  geometry: GeoJSONLineString;
  summary: RouteSummary;
  checkpoints: Checkpoint[];
}

export interface RecommendationInfo {
  route_id: string;
  explanation: string;
  recommended_blocked: boolean;
  all_blocked: boolean;
  corridor_note?: string | null;
}

export interface PlanResponse {
  id: string;
  inputs: PlanRequest;
  recommended_route_id: string;
  recommendation: RecommendationInfo;
  routes: RouteOption[];
}

export interface HeatmapResponse {
  plan_id: string;
  start_time: string; // ISO-8601 UTC
  hours: number; // 49
  points: [number, number][]; // [lat, lon]
  risk: number[][]; // [num_points][49] ordinals 0..4
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
