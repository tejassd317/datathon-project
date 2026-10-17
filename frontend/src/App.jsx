import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { DemoNotice } from './components/DemoNotice';
import { DashboardMetrics } from './components/DashboardMetrics';
import { NetworkMap } from './components/NetworkMap';
import { InventoryTable } from './components/InventoryTable';
import { ForecastChart } from './components/ForecastChart';
import { RiskPriorityMatrix } from './components/RiskPriorityMatrix';
import { DisruptionSimulator } from './components/DisruptionSimulator';
import { RedistributionOptimizer } from './components/RedistributionOptimizer';
import { TransferManagement } from './components/TransferManagement';
import { AssessmentReportModal } from './components/AssessmentReportModal';
import { 
  Activity, FileText, RotateCcw, AlertTriangle, Layers, Server, 
  Map, Database, HelpCircle, CheckCircle2 
} from 'lucide-react';
import './App.css';

export function App() {
  const [summary, setSummary] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [currentScenario, setCurrentScenario] = useState(null);

  const [selectedInventoryId, setSelectedInventoryId] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [riskFilter, setRiskFilter] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [transferRefresh, setTransferRefresh] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [sumRes, invRes, scenRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getInventory(),
        api.getCurrentScenario()
      ]);

      setSummary(sumRes.summary);
      setFacilities(sumRes.facilities || []);
      setMedicines(sumRes.medicines || []);
      setRoutes(sumRes.routes || []);
      setInventory(invRes.inventory || []);
      setCurrentScenario(scenRes.currentScenario || null);

      // Auto-select first critical item for forecast preview if none selected
      if (!selectedInventoryId && invRes.inventory?.length > 0) {
        const crit = invRes.inventory.find(i => i.riskTier === 'CRITICAL');
        if (crit) setSelectedInventoryId(crit.inventoryId);
        else setSelectedInventoryId(invRes.inventory[0].inventoryId);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSimulationComplete = (res) => {
    loadAllData();
  };

  const handleTransferExecuted = () => {
    setTransferRefresh(prev => prev + 1);
    loadAllData();
  };

  const handleResetBaseline = async () => {
    if (confirm("Reset all inventory stocks and disruption scenarios to initial demo baseline?")) {
      await api.resetInventory();
      await api.simulateDisruption({
        name: "Standard Baseline Operations",
        supplierDelayDays: 0,
        consumptionMultiplier: 1.0,
        blockedRouteIds: []
      });
      loadAllData();
    }
  };

  return (
    <div className="app-layout">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="brand-logo">
            <Activity className="brand-icon" size={24} />
            <div>
              <div className="brand-title">MediReach AI</div>
              <div className="brand-subtitle">IBM Z Datathon 2026 • Vulnerable Rural Network Optimizer</div>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-pill">
            <Server size={14} className="text-emerald-500" />
            <span>Target: IBM LinuxONE (s390x)</span>
          </div>

          <button 
            onClick={() => setShowReportModal(true)} 
            className="btn-header-report"
          >
            <FileText size={15} /> Assessment Report
          </button>

          <button 
            onClick={handleResetBaseline}
            className="btn-header-reset"
            title="Reset dataset to demo initial state"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </header>

      {/* Prominent Demo Notice Bar */}
      <DemoNotice />

      {/* Main Dashboard Content */}
      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>Connection to backend service error: {error}. Check that backend is running on port 5001.</span>
          </div>
        )}

        {/* 1. KPI Metrics Strip */}
        <DashboardMetrics 
          summary={summary} 
          onFilterRisk={(tier) => setRiskFilter(tier)}
          activeFilter={riskFilter}
        />

        {/* 2. Topology Map & Forecast Chart in 2-Column Split */}
        <div className="dashboard-row-split">
          <div className="split-left">
            <NetworkMap 
              facilities={facilities}
              routes={routes}
              inventory={inventory}
              onSelectFacility={(facId) => setSelectedFacilityId(facId)}
              selectedFacilityId={selectedFacilityId}
            />
          </div>

          <div className="split-right">
            {selectedInventoryId ? (
              <ForecastChart 
                inventoryId={selectedInventoryId} 
                onClose={() => setSelectedInventoryId(null)}
              />
            ) : (
              <div className="card-panel flex flex-col items-center justify-center p-12 text-center text-muted">
                <Layers size={36} className="mb-2 opacity-40" />
                <p>Click "Forecast" on any medicine in the table below to inspect its 7–30 day stockout trajectory.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Disruption Stress-Test Simulator */}
        <DisruptionSimulator 
          routes={routes}
          onSimulationComplete={handleSimulationComplete}
          currentScenario={currentScenario}
        />

        {/* 4. Redistribution Optimizer & Human Approval */}
        <RedistributionOptimizer 
          onTransferExecuted={handleTransferExecuted}
        />

        {/* 5. Inventory Table */}
        <InventoryTable 
          inventory={inventory}
          facilities={facilities}
          medicines={medicines}
          onSelectForecast={(invId) => setSelectedInventoryId(invId)}
          selectedInventoryId={selectedInventoryId}
        />

        {/* 6. Multi-Factor Risk Prioritization Engine */}
        <RiskPriorityMatrix 
          inventory={inventory}
          onSelectForecast={(invId) => setSelectedInventoryId(invId)}
        />

        {/* 7. Transfers Audit Trail */}
        <TransferManagement 
          refreshTrigger={transferRefresh}
        />
      </main>

      {/* Assessment Report Modal */}
      {showReportModal && (
        <AssessmentReportModal 
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <strong>MediReach AI</strong> — Predictive Supply Chain Optimization for Critical Pharmaceuticals in Vulnerable Rural Networks.
          <br />
          Built for <strong>IBM Z Datathon 2026</strong>. Zero-Python Node.js/Express + React architecture tailored for IBM LinuxONE & edge health facilities.
        </div>
        <div className="footer-right">
          <span className="footer-tag">No PII</span>
          <span className="footer-tag">Synthetic Dataset</span>
          <span className="footer-tag">Deterministic Heuristics</span>
          <span className="footer-tag">Human Authorization In The Loop</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
