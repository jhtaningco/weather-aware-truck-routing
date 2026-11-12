import { describe, expect, it } from 'vitest';
import { RISK_LEVELS, avgRiskToOrdinal, type RiskLevelOrdinal } from './risk';

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

  it('correctly maps continuous average risk to ordinals', () => {
    expect(avgRiskToOrdinal(0)).toBe(0);
    expect(avgRiskToOrdinal(0.49)).toBe(0);
    expect(avgRiskToOrdinal(0.5)).toBe(1);
    expect(avgRiskToOrdinal(1.49)).toBe(1);
    expect(avgRiskToOrdinal(1.5)).toBe(2);
    expect(avgRiskToOrdinal(2.49)).toBe(2);
    expect(avgRiskToOrdinal(2.5)).toBe(3);
    expect(avgRiskToOrdinal(3.49)).toBe(3);
    expect(avgRiskToOrdinal(3.5)).toBe(4);
    expect(avgRiskToOrdinal(4.0)).toBe(4);
  });
});
