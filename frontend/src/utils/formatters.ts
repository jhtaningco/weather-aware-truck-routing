import dayjs from 'dayjs';

/**
 * Format duration in seconds to human readable "Xh Ym" or "Ym".
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0m';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Format distance in miles to 1 decimal place with 'mi' suffix.
 */
export function formatDistance(miles: number): string {
  if (miles < 0) return '0.0 mi';
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format ISO-8601 timestamp to human readable date/time with timezone indicator.
 */
export function formatETA(isoString: string): string {
  const parsed = dayjs(isoString);
  if (!parsed.isValid()) return isoString;
  return parsed.format('MMM D, h:mm A');
}

/**
 * Format average risk ordinal (0.0 to 4.0) to 2 decimal places.
 */
export function formatAvgRisk(risk: number): string {
  return risk.toFixed(2);
}
