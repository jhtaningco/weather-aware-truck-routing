export type RiskLevelOrdinal = 0 | 1 | 2 | 3 | 4;

export type RiskLevelKey = 'low' | 'moderate' | 'high' | 'severe' | 'no_travel';

export interface RiskColorSpec {
  solid: string;
  soft: string;
  label: string;
  key: RiskLevelKey;
}

export const RISK_LEVELS: Record<RiskLevelOrdinal, RiskColorSpec> = {
  0: {
    solid: '#12B76A',
    soft: '#ECFDF3',
    label: 'Low',
    key: 'low',
  },
  1: {
    solid: '#FDB022',
    soft: '#FFFAEB',
    label: 'Moderate',
    key: 'moderate',
  },
  2: {
    solid: '#F97316',
    soft: '#FFF4ED',
    label: 'High',
    key: 'high',
  },
  3: {
    solid: '#D92D20',
    soft: '#FEF3F2',
    label: 'Severe',
    key: 'severe',
  },
  4: {
    solid: '#7A1F1F',
    soft: '#F4E6E6',
    label: 'No Travel',
    key: 'no_travel',
  },
};
