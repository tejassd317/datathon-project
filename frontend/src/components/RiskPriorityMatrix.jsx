import React, { useState } from 'react';
import { AlertOctagon, ShieldAlert, ChevronDown, ChevronUp, Snowflake } from 'lucide-react';

export function RiskPriorityMatrix({ inventory, onSelectForecast }) {
  const [expandedId, setExpandedId] = useState(null);

  // Filter to items with high or critical risk, sorted by risk score descending
  const sortedRisks = [...inventory].sort((a, b) => b.riskScore - a.riskScore);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Multi-Factor Risk Prioritization Engine</h2>
          <p className="panel-subtitle">
            Explainable weighted scoring: Urgency (35%) + Medicine Criticality (30%) + Lead Time Deficit (20%) + Facility Vulnerability (15%).
          </p>
        </div>
      </div>

      <div className="risk-cards-list">
        {sortedRisks.slice(0, 6).map((item, idx) => {
          const isExpanded = expandedId === item.inventoryId;
          const factors = item.riskFactors || {};

          return (
            <div key={item.inventoryId} className={`risk-card tier-${item.riskTier?.toLowerCase() || 'low'}`}>
              <div className="risk-card-main" onClick={() => toggleExpand(item.inventoryId)}>
                <div className="risk-rank-badge">#{idx + 1}</div>

                <div className="risk-card-info">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.medicineName}</span>
                    {item.requiresColdChain && (
                      <span className="cold-chain-pill text-xs">
                        <Snowflake size={11} /> Cold Chain
                      </span>
                    )}
                    <span className={`risk-badge badge-${item.riskTier?.toLowerCase() || 'low'}`}>
                      {item.riskTier} (Score: {item.riskScore}/100)
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mt-0.5">
                    <strong>{item.facilityName}</strong> • Current stock: <span className="font-mono font-bold">{item.currentStock} {item.unit}</span> (burn: {item.effectiveDailyConsumption}/d)
                  </div>
                </div>

                <div className="risk-card-action">
                  <span className="text-xs font-semibold text-slate-500 mr-2">
                    {item.daysUntilStockout <= 0 ? 'Depleted' : `${item.daysUntilStockout}d stockout`}
                  </span>
                  <button className="expand-btn">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="risk-card-breakdown">
                  <div className="breakdown-grid">
                    <div className="factor-box">
                      <div className="factor-header">
                        <span>Urgency Score (35%)</span>
                        <strong className="text-slate-800">{factors.urgency?.score || 0}/100</strong>
                      </div>
                      <div className="factor-detail">{factors.urgency?.detail || 'Stockout days evaluation'}</div>
                    </div>

                    <div className="factor-box">
                      <div className="factor-header">
                        <span>Clinical Criticality (30%)</span>
                        <strong className="text-slate-800">{factors.criticality?.score || 0}/100</strong>
                      </div>
                      <div className="factor-detail">{factors.criticality?.detail || 'Clinical indication severity'}</div>
                    </div>

                    <div className="factor-box">
                      <div className="factor-header">
                        <span>Lead Time Gap (20%)</span>
                        <strong className="text-slate-800">{factors.leadTimeDeficit?.score || 0}/100</strong>
                      </div>
                      <div className="factor-detail">{factors.leadTimeDeficit?.detail || 'Replenishment order lag'}</div>
                    </div>

                    <div className="factor-box">
                      <div className="factor-header">
                        <span>Facility Vulnerability (15%)</span>
                        <strong className="text-slate-800">{factors.facilityVulnerability?.score || 0}/100</strong>
                      </div>
                      <div className="factor-detail">{factors.facilityVulnerability?.detail || 'Physical accessibility and population'}</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => onSelectForecast(item.inventoryId)}
                      className="action-btn-inspect"
                    >
                      View 30-Day Trajectory
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
