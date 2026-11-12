import { describe, expect, it } from 'vitest';
import type { Checkpoint } from '../../types/api';
import { createCheckpointPopupHtml } from './popupContent';

describe('createCheckpointPopupHtml', () => {
  const mockCheckpoint: Checkpoint = {
    index: 2,
    lat: 33.123,
    lon: -96.456,
    mile: 50.0,
    eta: '2026-11-12T15:00:00Z',
    weather: {
      wind_mph: 38.5,
      gust_mph: 45.2,
      rain_in_hr: 0.15,
      snow_in_hr: 0.0,
    },
    risk: {
      level: 3,
      level_name: 'Severe',
      wind: 2,
      rain: 1,
      snow: 0,
      load_escalated: true,
      drivers: ['wind', 'load'],
    },
  };

  it('renders checkpoint mile, weather parameters, and risk level', () => {
    const html = createCheckpointPopupHtml(mockCheckpoint, 250.0, 42000);
    expect(html).toContain('Mile 50.0 of 250.0');
    expect(html).toContain('Severe');
    expect(html).toContain('38.5 mph');
    expect(html).toContain('45.2 mph');
    expect(html).toContain('0.15 in/hr');
  });

  it('renders load escalation alert when load_escalated is true', () => {
    const html = createCheckpointPopupHtml(mockCheckpoint, 250.0, 42000);
    expect(html).toContain('Load Rule Escalation');
    expect(html).toContain('42,000 lb');
    expect(html).toContain('escalated risk to');
  });

  it('omits escalation alert when load_escalated is false', () => {
    const nonEscalated: Checkpoint = {
      ...mockCheckpoint,
      risk: {
        ...mockCheckpoint.risk,
        level: 1,
        load_escalated: false,
        drivers: ['rain'],
      },
    };
    const html = createCheckpointPopupHtml(nonEscalated, 250.0, 25000);
    expect(html).not.toContain('Load Rule Escalation');
    expect(html).toContain('rain');
  });
});
