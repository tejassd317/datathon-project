import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileDown, Download, Printer, Copy, Check, FileText, X } from 'lucide-react';

export function AssessmentReportModal({ onClose }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getAssessmentReport()
      .then(res => {
        setReportData(res);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleCopyMarkdown = () => {
    if (reportData?.markdown) {
      navigator.clipboard.writeText(reportData.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-large">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-sky-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Vulnerable Network Pharmaceutical Supply Chain Assessment
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={api.getDownloadCsvUrl()} 
              download="MediReach_AI_Inventory_Assessment.csv"
              className="btn-download-pill"
            >
              <Download size={13} /> Export CSV
            </a>
            <a 
              href={api.getDownloadMarkdownUrl()} 
              download="MediReach_AI_Assessment_Report.md"
              className="btn-download-pill"
            >
              <FileDown size={13} /> Export Markdown
            </a>
            <button onClick={handlePrint} className="btn-icon" title="Print / Save PDF">
              <Printer size={16} />
            </button>
            <button onClick={onClose} className="close-btn" title="Close report">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body print-area">
          {loading ? (
            <div className="py-16 text-center text-muted">Compiling clinical supply chain assessment report...</div>
          ) : reportData ? (
            <div className="report-markdown-preview">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-mono">
                  Generated: {new Date(reportData.timestamp).toLocaleString()} | IBM Z Datathon 2026
                </span>
                <button onClick={handleCopyMarkdown} className="btn-copy-raw">
                  {copied ? <><Check size={12} /> Copied Markdown</> : <><Copy size={12} /> Copy Markdown</>}
                </button>
              </div>

              {/* Formatted Report View */}
              <div className="report-rendered-sheet">
                <div className="report-badge-banner">
                  DEMO ASSESSMENT REPORT • IBM Z DATATHON 2026 • MEDIREACH AI
                </div>

                <h1 className="text-xl font-bold text-slate-900 mt-3 mb-1">
                  Predictive Supply Chain Optimization for Critical Pharmaceuticals in Vulnerable Rural Networks
                </h1>
                <p className="text-xs text-slate-600 mb-4">
                  Assessment Target: Baringo Escarpment, Ainabkoi Highland & East Pokot Arid Corridors
                </p>

                <div className="report-stats-grid">
                  <div className="report-stat-box">
                    <span className="text-xs text-slate-500 uppercase">Monitored Facilities</span>
                    <strong className="text-lg text-slate-900">{reportData.summary.totalFacilities}</strong>
                  </div>
                  <div className="report-stat-box">
                    <span className="text-xs text-slate-500 uppercase">Monitored Medicines</span>
                    <strong className="text-lg text-slate-900">{reportData.summary.totalMedicines}</strong>
                  </div>
                  <div className="report-stat-box">
                    <span className="text-xs text-slate-500 uppercase">High-Risk Stockouts</span>
                    <strong className="text-lg text-red">{reportData.summary.criticalStockoutsCount}</strong>
                  </div>
                  <div className="report-stat-box">
                    <span className="text-xs text-slate-500 uppercase">Feasible Transfers</span>
                    <strong className="text-lg text-emerald-700">{reportData.summary.feasibleTransfersCount}</strong>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-6 mb-2">
                  Top Priority Stockout Risks
                </h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Medicine</th>
                      <th>Urgency / Stockout</th>
                      <th>Criticality</th>
                      <th>Risk Score</th>
                      <th>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.risks.slice(0, 8).map(r => (
                      <tr key={r.inventoryId}>
                        <td><strong>{r.facilityName}</strong></td>
                        <td>{r.medicineName}</td>
                        <td>{r.factors.urgency.detail}</td>
                        <td>{r.factors.criticality.score}/100</td>
                        <td className="font-mono font-bold">{r.compositeScore}/100</td>
                        <td><span className={`risk-badge badge-${r.riskTier?.toLowerCase()}`}>{r.riskTier}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-6 mb-2">
                  Key Actionable Redistribution Interventions
                </h3>
                <div className="space-y-2">
                  {reportData.recommendations.slice(0, 4).map(rec => (
                    <div key={rec.actionId} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                      <div className="font-bold text-slate-900 mb-0.5">
                        {rec.proposedAction}
                      </div>
                      <div className="text-slate-600">
                        <strong>Clinical Benefit:</strong> {rec.expectedBenefit}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Status: <span className="font-semibold text-slate-700">{rec.approvalStatus}</span> • Reason: {rec.reason}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="report-signoff-block">
                  <div className="signoff-line">
                    <span>Clinical Pharmacist Reviewer: _____________________________</span>
                    <span>Date: ____________________</span>
                  </div>
                  <div className="signoff-line mt-4">
                    <span>County Logistics Director: _____________________________</span>
                    <span>Approval Stamp: [  OFFICIAL  ]</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
