import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ArrowRight, ShieldCheck, AlertTriangle, CheckCircle, Snowflake, Truck, 
  UserCheck, Send, XCircle, FileText, Check 
} from 'lucide-react';

export function RedistributionOptimizer({ onTransferExecuted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('TRANSFERS'); // TRANSFERS | ACTIONS
  const [selectedRecForApproval, setSelectedRecForApproval] = useState(null);
  const [approverName, setApproverName] = useState('Dr. Jane Muthoni (Supply Officer)');
  const [approvalNotes, setApprovalNotes] = useState('Authorized emergency inter-facility redistribution for maternal & critical care.');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadData = () => {
    setLoading(true);
    api.getRedistributionRecommendations()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenApprovalModal = (rec) => {
    setSelectedRecForApproval(rec);
    setSuccessMessage(null);
  };

  const handleExecuteApproval = async () => {
    if (!selectedRecForApproval) return;
    setSubmitting(true);
    try {
      const payload = {
        recommendationId: selectedRecForApproval.recommendationId,
        donorFacilityId: selectedRecForApproval.donorFacility.id,
        recipientFacilityId: selectedRecForApproval.recipientFacility.id,
        medicineId: selectedRecForApproval.medicine.id,
        quantity: selectedRecForApproval.transferDetails.recommendedQuantity,
        approverName,
        notes: approvalNotes
      };

      const res = await api.approveTransfer(payload);
      if (res.success) {
        setSuccessMessage(`Successfully dispatched ${res.transfer.quantity} units! Stock balances updated.`);
        setTimeout(() => {
          setSelectedRecForApproval(null);
          setSuccessMessage(null);
          loadData();
          if (onTransferExecuted) onTransferExecuted();
        }, 1800);
      }
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="card-panel text-center py-12 text-muted">
        Computing zero-harm redistribution transfers and route constraints...
      </div>
    );
  }

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="panel-title">Inventory Redistribution Optimizer & Human Approval</h2>
            <span className="badge-zero-harm">
              <ShieldCheck size={12} /> Zero-Harm Donor Policy Active
            </span>
          </div>
          <p className="panel-subtitle">
            Algorithmically identifies candidate donor facilities, enforces safety thresholds, validates cold-chain and transit routes, and requires human clinician authorization.
          </p>
        </div>

        <div className="tab-pill-group">
          <button 
            onClick={() => setActiveTab('TRANSFERS')}
            className={`tab-pill-btn ${activeTab === 'TRANSFERS' ? 'active' : ''}`}
          >
            Transfer Proposals ({data?.summary?.totalRecommendations || 0})
          </button>
          <button 
            onClick={() => setActiveTab('ACTIONS')}
            className={`tab-pill-btn ${activeTab === 'ACTIONS' ? 'active' : ''}`}
          >
            Actionable Recommendations ({data?.summary?.actionableAlertsCount || 0})
          </button>
        </div>
      </div>

      {activeTab === 'TRANSFERS' ? (
        <div className="redistribution-list">
          {(!data || data.redistributionRecommendations?.length === 0) ? (
            <div className="p-8 text-center text-muted">
              No inter-facility redistribution needed at current inventory levels.
            </div>
          ) : (
            data.redistributionRecommendations.map(rec => {
              const isFeasible = rec.feasibility.isFeasible;
              return (
                <div key={rec.recommendationId} className={`redistribution-card ${isFeasible ? 'feasible-card' : 'constrained-card'}`}>
                  <div className="card-top-row">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{rec.medicine.name}</span>
                      {rec.medicine.requiresColdChain && (
                        <span className="cold-chain-pill">
                          <Snowflake size={11} /> {rec.medicine.temperatureRange}
                        </span>
                      )}
                      <span className="badge-criticality">
                        Criticality {rec.medicine.criticality}/10
                      </span>
                    </div>

                    <div>
                      {isFeasible ? (
                        <span className="badge-status-feasible">
                          <CheckCircle size={13} /> Feasible Transfer
                        </span>
                      ) : (
                        <span className="badge-status-constrained" title={rec.feasibility.issues.join('; ')}>
                          <AlertTriangle size={13} /> {rec.feasibility.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transfer Pipeline Layout */}
                  <div className="transfer-pipeline">
                    <div className="donor-node">
                      <div className="node-role">DONOR FACILITY</div>
                      <div className="node-name">{rec.donorFacility.name}</div>
                      <div className="node-meta">
                        Stock: {rec.donorFacility.currentStock} | Buffer Post-Transfer: <strong>{rec.donorFacility.bufferDaysAfterTransfer}d</strong>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        ✓ Safety stock ({rec.donorFacility.safetyThreshold}) strictly preserved
                      </div>
                    </div>

                    <div className="transfer-flow">
                      <div className="transfer-qty-pill font-mono">
                        +{rec.transferDetails.recommendedQuantity} {rec.medicine.unit}
                      </div>
                      <div className="transfer-arrow-line">
                        <ArrowRight size={18} className="arrow-icon" />
                      </div>
                      <div className="transit-time-text">
                        ~{rec.transferDetails.estimatedTransitHours || '?'}h transit ({rec.transferDetails.estimatedDistanceKm || '?'} km)
                      </div>
                    </div>

                    <div className="recipient-node">
                      <div className="node-role text-red font-bold">RECIPIENT DEFICIT NODE</div>
                      <div className="node-name">{rec.recipientFacility.name}</div>
                      <div className="node-meta">
                        Current: <strong className="text-red">{rec.recipientFacility.currentStock}</strong> | Stockout in: <strong className="text-red">{rec.recipientFacility.daysUntilStockout}d</strong>
                      </div>
                      <div className="text-[11px] text-sky-700 font-medium mt-0.5">
                        Adds +{rec.transferDetails.coverageDaysAdded} days coverage
                      </div>
                    </div>
                  </div>

                  {/* Constraint Warning if not feasible */}
                  {!isFeasible && (
                    <div className="constraint-warning-box">
                      <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>Physical Logistics Restriction Detected:</strong>
                        <ul className="list-disc list-inside mt-0.5 text-xs text-amber-900">
                          {rec.feasibility.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Explainable Rationale */}
                  <div className="explainable-reason-text">
                    <strong>Algorithmic Rationale:</strong> {rec.explainableReason}
                  </div>

                  {/* Human In the Loop Trigger */}
                  <div className="card-footer-action">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-slate-400" />
                      Human Approval Gate: <strong>Required prior to physical transfer</strong>
                    </div>

                    {isFeasible ? (
                      <button 
                        onClick={() => handleOpenApprovalModal(rec)}
                        className="btn-approve-transfer"
                      >
                        <Send size={14} /> Review & Authorize Transfer
                      </button>
                    ) : (
                      <button disabled className="btn-approve-disabled">
                        Transfer Infeasible (Clear Constraints First)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Actionable Recommendations Tab */
        <div className="actions-list">
          {(!data || data.actionableRecommendations?.length === 0) ? (
            <div className="p-8 text-center text-muted">No pending alerts.</div>
          ) : (
            data.actionableRecommendations.map(action => (
              <div key={action.actionId} className={`action-card action-tier-${action.priority?.toLowerCase() || 'medium'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`risk-badge badge-${action.priority?.toLowerCase() || 'medium'}`}>
                      {action.priority} PRIORITY
                    </span>
                    <h4 className="font-bold text-base text-slate-900 mt-1">
                      {action.medicine} — {action.facility}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{action.actionId}</span>
                </div>

                <div className="action-section">
                  <div className="action-row">
                    <span className="action-key">Reason / Clinical Trigger:</span>
                    <span className="action-val text-slate-700">{action.reason}</span>
                  </div>
                  <div className="action-row">
                    <span className="action-key">Proposed Action:</span>
                    <span className="action-val font-semibold text-slate-900">{action.proposedAction}</span>
                  </div>
                  <div className="action-row">
                    <span className="action-key">Expected Benefit:</span>
                    <span className="action-val text-emerald-700 font-medium">{action.expectedBenefit}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Human Approval Modal */}
      {selectedRecForApproval && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <UserCheck size={20} className="text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Authorize Pharmaceutical Stock Transfer</h3>
              </div>
              <button 
                onClick={() => setSelectedRecForApproval(null)}
                className="close-btn"
              >✕</button>
            </div>

            <div className="modal-body">
              {successMessage ? (
                <div className="p-6 text-center text-emerald-700 font-bold bg-emerald-50 rounded-lg flex flex-col items-center gap-2">
                  <CheckCircle size={32} />
                  {successMessage}
                </div>
              ) : (
                <>
                  <div className="transfer-summary-box mb-4">
                    <div className="text-xs text-slate-500 mb-1">CONSEQUENTIAL ACTION SUMMARY:</div>
                    <div className="font-bold text-base text-slate-900">
                      Transfer {selectedRecForApproval.transferDetails.recommendedQuantity} {selectedRecForApproval.medicine.unit} of {selectedRecForApproval.medicine.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      From: <strong>{selectedRecForApproval.donorFacility.name}</strong> → To: <strong>{selectedRecForApproval.recipientFacility.name}</strong>
                    </div>
                    <div className="text-xs text-sky-800 mt-2 bg-sky-50 p-2 rounded">
                      Expected clinical benefit: Extends coverage by <strong>+{selectedRecForApproval.transferDetails.coverageDaysAdded} days</strong>.
                      Donor maintains <strong>{selectedRecForApproval.donorFacility.bufferDaysAfterTransfer} days</strong> of safety buffer.
                    </div>
                  </div>

                  <div className="form-group mb-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Authorizing Officer Name & Title:
                    </label>
                    <input 
                      type="text" 
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Dr. Jane Muthoni (Pharmacist In-Charge)"
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Clinical & Logistics Justification Notes:
                    </label>
                    <textarea 
                      rows="2"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="modal-actions">
                    <button 
                      onClick={() => setSelectedRecForApproval(null)}
                      className="btn-secondary"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleExecuteApproval}
                      disabled={submitting}
                      className="btn-confirm-approve"
                    >
                      {submitting ? 'Executing Dispatch...' : <><Check size={16} /> Confirm & Dispatch Transfer</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
