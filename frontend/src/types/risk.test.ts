import { describe, expect, it } from 'vitest';
import { RISK_LEVELS, type RiskLevelOrdinal } from './risk';

describe('RiskLevel tokens', () => {
  it('defines all 5 ordinal levels with solid and soft tokens', () => {
    const levels: RiskLevelOrdinal[] = [0, 1, 2, 3, 4];
    for (const lvl of levels) {
      const spec = RISK_LEVELS[lvl];
      expect(spec).toBeDefined();
      expect(spec.solid).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.soft).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(spec.label).toBeTruthy();
    }
  });

  it('matches the exact risk palette specified in Section 9', () => {
    expect(RISK_LEVELS[0].solid).toBe('#12B76A'); // Low
    expect(RISK_LEVELS[1].solid).toBe('#FDB022'); // Moderate
    expect(RISK_LEVELS[2].solid).toBe('#F97316'); // High
    expect(RISK_LEVELS[3].solid).toBe('#D92D20'); // Severe
    expect(RISK_LEVELS[4].solid).toBe('#7A1F1F'); // No Travel
  });
});
