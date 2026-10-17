import React from 'react';
import { AlertTriangle, ShieldCheck, Database, Server } from 'lucide-react';

export function DemoNotice() {
  return (
    <div className="demo-notice-bar">
      <div className="demo-notice-content">
        <span className="badge-demo">SYNTHETIC DEMO DATA</span>
        <span className="demo-notice-text">
          <strong>IBM Z Datathon 2026</strong> | Project <em>MediReach AI</em>: Predictive Supply Chain Optimization for Critical Pharmaceuticals in Vulnerable Rural Networks.
          Strictly synthetic demonstration data. No patient-identifiable information (No PII). All stockout forecasts use transparent baseline heuristics.
        </span>
      </div>
      <div className="demo-notice-meta">
        <span className="meta-pill"><Server size={12} /> LinuxONE / Node.js Engine</span>
        <span className="meta-pill"><Database size={12} /> In-Memory State</span>
      </div>
    </div>
  );
}
