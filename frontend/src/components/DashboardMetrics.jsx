import React from 'react';
import { Building2, Pill, AlertOctagon, Bell, Snowflake, Route, ShieldAlert } from 'lucide-react';

export function DashboardMetrics({ summary, onFilterRisk, activeFilter }) {
  if (!summary) return null;

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-icon blue">
          <Building2 size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Monitored Facilities</div>
          <div className="metric-value">{summary.totalFacilities}</div>
          <div className="metric-subtext">
            <span>{summary.coldChainFacilitiesCount} cold-chain capable</span>
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon purple">
          <Pill size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Monitored Medicines</div>
          <div className="metric-value">{summary.totalMedicines}</div>
          <div className="metric-subtext">Life-saving & essential categories</div>
        </div>
      </div>

      <div 
        className={`metric-card clickable ${activeFilter === 'CRITICAL' ? 'selected-card red-border' : ''}`}
        onClick={() => onFilterRisk(activeFilter === 'CRITICAL' ? null : 'CRITICAL')}
        title="Click to filter critical stockouts in table"
      >
        <div className="metric-icon red">
          <AlertOctagon size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Critical Stockouts</div>
          <div className="metric-value text-red">{summary.criticalStockoutsCount}</div>
          <div className="metric-subtext">
            <span className="urgent-pulse">Exhaustion within ≤ 3 days</span>
          </div>
        </div>
      </div>

      <div 
        className={`metric-card clickable ${activeFilter === 'HIGH' ? 'selected-card amber-border' : ''}`}
        onClick={() => onFilterRisk(activeFilter === 'HIGH' ? null : 'HIGH')}
        title="Click to filter high risk items"
      >
        <div className="metric-icon amber">
          <Bell size={24} />
        </div>
        <div className="metric-info">
          <div className="metric-label">Pending Alerts</div>
          <div className="metric-value text-amber">{summary.pendingAlertsCount}</div>
          <div className="metric-subtext">
            <span>Includes {summary.highRiskCount} high-risk buffers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
