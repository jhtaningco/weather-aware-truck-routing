import type { Checkpoint } from '../../types/api';
import { RISK_LEVELS } from '../../types/risk';
import { formatETA } from '../../utils/formatters';

export function createCheckpointPopupHtml(
  checkpoint: Checkpoint,
  totalDistanceMi: number,
  loadLb: number,
): string {
  const spec = RISK_LEVELS[checkpoint.risk.level] ?? RISK_LEVELS[0];
  const etaFormatted = formatETA(checkpoint.eta);

  const escalationNotice = checkpoint.risk.load_escalated
    ? `
    <div style="margin-top: 8px; padding: 6px 8px; background: #FEF3F2; border-left: 3px solid #D92D20; border-radius: 4px; font-size: 11px; color: #B42318; line-height: 1.4;">
      <strong>⚠️ Load Rule Escalation:</strong><br/>
      Vehicle load (${loadLb.toLocaleString()} lb) + sustained wind (${checkpoint.weather.wind_mph.toFixed(1)} mph) escalated risk to <strong>${spec.label}</strong>.
    </div>
  `
    : '';

  const driversList = checkpoint.risk.drivers.length > 0
    ? checkpoint.risk.drivers.map((d) => `<span style="display:inline-block; margin-right:4px; padding: 2px 6px; background:#F2F4F7; border-radius:10px; font-size:10px; color:#344054;">${d}</span>`).join('')
    : '<span style="font-size:11px; color:#667085;">Normal conditions</span>';

  return `
    <div style="font-family: 'Outfit', sans-serif; min-width: 230px; padding: 2px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #EAECF0; padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 13px; color: #1D2939;">
          Mile ${checkpoint.mile.toFixed(1)} of ${totalDistanceMi.toFixed(1)}
        </span>
        <span style="background: ${spec.soft}; color: ${spec.solid}; font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 12px; border: 1px solid ${spec.solid}40;">
          ${spec.label}
        </span>
      </div>

      <!-- ETA & Arrival Context -->
      <div style="background: #F8FAFC; border: 1px solid #EAECF0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
        <span style="color: #667085; display: block; font-size: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px;">
          🚚 Truck Arrival ETA:
        </span>
        <strong style="color: #1D2939; font-size: 12px;">${etaFormatted}</strong>
      </div>

      <!-- Weather Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #F8FAFC; padding: 8px; border-radius: 6px; border: 1px solid #EEF2F6; font-size: 11px; margin-bottom: 8px;">
        <div>
          <span style="color: #667085; display:block;">Wind (10m)</span>
          <span style="font-weight: 600; color: #1D2939;">${checkpoint.weather.wind_mph.toFixed(1)} mph</span>
        </div>
        <div>
          <span style="color: #667085; display:block;">Wind Gusts</span>
          <span style="font-weight: 600; color: #1D2939;">${checkpoint.weather.gust_mph.toFixed(1)} mph</span>
        </div>
        <div>
          <span style="color: #667085; display:block;">Rain Rate</span>
          <span style="font-weight: 600; color: #1D2939;">${checkpoint.weather.rain_in_hr.toFixed(2)} in/hr</span>
        </div>
        <div>
          <span style="color: #667085; display:block;">Snow Rate</span>
          <span style="font-weight: 600; color: #1D2939;">${checkpoint.weather.snow_in_hr.toFixed(2)} in/hr</span>
        </div>
      </div>

      <!-- Risk Drivers -->
      <div style="margin-top: 4px;">
        <div style="font-size: 10.5px; color: #667085; margin-bottom: 3px;">Driving Conditions:</div>
        <div>${driversList}</div>
      </div>

      <!-- Escalation Notice -->
      ${escalationNotice}
    </div>
  `;
}
