import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, CheckCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export function TransferManagement({ refreshTrigger }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = () => {
    setLoading(true);
    api.getTransfers()
      .then(res => {
        if (res.transfers) setTransfers(res.transfers);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchTransfers();
  }, [refreshTrigger]);

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="panel-title">Authorized Stock Redistribution Audit Trail</h2>
            <span className="badge-audit">
              <ShieldCheck size={12} /> Immutable Dispatch Log
            </span>
          </div>
          <p className="panel-subtitle">
            Permanent chain-of-custody audit records for all human-authorized emergency pharmaceutical rebalancings.
          </p>
        </div>

        <button onClick={fetchTransfers} className="btn-secondary-sm" title="Refresh transfer log">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="transfers-log-container">
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No inter-facility transfers executed yet. Approve a transfer proposal above to record a dispatch.
          </div>
        ) : (
          <div className="transfers-table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Timestamp</th>
                  <th>From (Donor)</th>
                  <th>To (Recipient)</th>
                  <th>Medicine</th>
                  <th>Quantity</th>
                  <th>Authorized By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.transferId}>
                    <td className="font-mono text-xs font-semibold text-slate-800">{t.transferId}</td>
                    <td className="text-xs text-slate-500">{new Date(t.approvedAt).toLocaleString()}</td>
                    <td className="font-semibold text-slate-700">{t.donorFacilityId}</td>
                    <td className="font-semibold text-slate-900">{t.recipientFacilityId}</td>
                    <td className="font-medium text-slate-800">{t.medicineId}</td>
                    <td className="font-mono font-bold text-sky-700">+{t.quantity} units</td>
                    <td className="text-xs text-slate-600">{t.approverName}</td>
                    <td>
                      <span className="badge-status-feasible text-xs">
                        <CheckCircle size={12} /> {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
