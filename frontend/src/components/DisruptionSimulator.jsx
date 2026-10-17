import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertTriangle, Sliders, Play, RotateCcw, CloudRain, Truck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function DisruptionSimulator({ routes, onSimulationComplete, currentScenario }) {
  const [presets, setPresets] = useState([]);
  const [supplierDelay, setSupplierDelay] = useState(0);
  const [consumptionSurge, setConsumptionSurge] = useState(1.0);
  const [blockedRoutes, setBlockedRoutes] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState('Custom Disruption');

  useEffect(() => {
    api.getDisruptionPresets()
      .then(res => {
        if (res.presets) setPresets(res.presets);
      })
      .catch(console.error);
  }, []);

  const handleApplyPreset = (preset) => {
    setScenarioName(preset.name);
    setSupplierDelay(preset.supplierDelayDays);
    setConsumptionSurge(preset.consumptionMultiplier);
    setBlockedRoutes(preset.blockedRouteIds || []);
    executeSimulation({
      name: preset.name,
      supplierDelayDays: preset.supplierDelayDays,
      consumptionMultiplier: preset.consumptionMultiplier,
      blockedRouteIds: preset.blockedRouteIds || []
    });
  };

  const toggleRouteBlock = (routeId) => {
    setBlockedRoutes(prev => 
      prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]
    );
  };

  const executeSimulation = async (overrideParams = null) => {
    setLoading(true);
    try {
      const payload = overrideParams || {
        name: scenarioName,
        supplierDelayDays: Number(supplierDelay),
        consumptionMultiplier: Number(consumptionSurge),
        blockedRouteIds: blockedRoutes
      };

      const res = await api.simulateDisruption(payload);
      if (res.success) {
        setSimulationResult(res.simulationResult);
        if (onSimulationComplete) {
          onSimulationComplete(res);
        }
      }
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetBaseline = () => {
    setScenarioName('Standard Baseline Operations');
    setSupplierDelay(0);
    setConsumptionSurge(1.0);
    setBlockedRoutes([]);
    executeSimulation({
      name: 'Standard Baseline Operations',
      supplierDelayDays: 0,
      consumptionMultiplier: 1.0,
      blockedRouteIds: []
    });
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="panel-title">Supply Disruption Stress-Test Simulator</h2>
            <span className="badge-scenario-active">
              Active: {currentScenario?.name || scenarioName}
            </span>
          </div>
          <p className="panel-subtitle">
            Simulate climate, infrastructure and logistics shocks to stress-test stock resilience and recalculate risk deltas.
          </p>
        </div>

        <button 
          onClick={handleResetBaseline}
          className="btn-secondary-sm"
          title="Reset to baseline parameters"
        >
          <RotateCcw size={14} /> Reset Baseline
        </button>
      </div>

      {/* Preset Scenarios Carousel / Buttons */}
      <div className="presets-row">
        <span className="presets-label">Datathon Stress Presets:</span>
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => handleApplyPreset(p)}
            className="preset-pill-btn"
          >
            {p.name.includes('Monsoon') ? <CloudRain size={13} /> : <Truck size={13} />}
            {p.name}
          </button>
        ))}
      </div>

      <div className="simulator-grid">
        {/* Sliders & Controls */}
        <div className="sim-controls-pane">
          <div className="control-group">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-800">
                Supplier Delivery Delay (Lead Time Lag)
              </label>
              <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-sm">
                +{supplierDelay} Days
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="28" 
              step="1"
              value={supplierDelay}
              onChange={(e) => setSupplierDelay(Number(e.target.value))}
              className="slider-input"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0d (Normal)</span>
              <span>+7d (Severe)</span>
              <span>+14d (Port Backlog)</span>
              <span>+28d (Critical)</span>
            </div>
          </div>

          <div className="control-group">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-800">
                Disease Outbreak Demand Surge Multiplier
              </label>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-sm">
                {consumptionSurge.toFixed(1)}x Normal
              </span>
            </div>
            <input 
              type="range" 
              min="1.0" 
              max="3.0" 
              step="0.1"
              value={consumptionSurge}
              onChange={(e) => setConsumptionSurge(Number(e.target.value))}
              className="slider-input"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>1.0x (Baseline)</span>
              <span>1.5x (Seasonal Peak)</span>
              <span>2.0x (Epidemic Spike)</span>
              <span>3.0x (Mass Outbreak)</span>
            </div>
          </div>

          <div className="control-group">
            <label className="text-sm font-semibold text-slate-800 mb-2 block">
              Transit Route Road Closures (Toggle Impassable Corridors)
            </label>
            <div className="route-toggles-list">
              {routes.map(r => {
                const isBlocked = blockedRoutes.includes(r.routeId);
                return (
                  <label key={r.routeId} className={`route-toggle-item ${isBlocked ? 'blocked' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={isBlocked}
                      onChange={() => toggleRouteBlock(r.routeId)}
                    />
                    <div className="route-toggle-label">
                      <span className="font-medium text-xs text-slate-800">{r.routeCode}</span>
                      <span className="text-[11px] text-slate-500"> ({r.roadCondition})</span>
                    </div>
                    {isBlocked ? (
                      <span className="badge-blocked">BLOCKED</span>
                    ) : (
                      <span className="badge-passable">PASSABLE</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <button 
            onClick={() => executeSimulation()}
            disabled={loading}
            className="btn-simulate-run"
          >
            {loading ? 'Recalculating Stress-Test...' : <><Play size={16} /> Run Stress-Test Simulation</>}
          </button>
        </div>

        {/* Real-time Delta Feedback Output */}
        <div className="sim-results-pane">
          {simulationResult ? (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Simulation Impact Assessment
              </h4>

              <div className="sim-delta-cards">
                <div className="delta-card">
                  <div className="delta-label">Baseline Critical</div>
                  <div className="delta-num text-slate-600">
                    {simulationResult.metrics.baselineCriticalCount}
                  </div>
                </div>

                <div className="delta-card">
                  <div className="delta-label">Simulated Critical</div>
                  <div className="delta-num text-red">
                    {simulationResult.metrics.simulatedCriticalCount}
                  </div>
                </div>

                <div className="delta-card highlight-danger">
                  <div className="delta-label">Net Deterioration</div>
                  <div className="delta-num text-red">
                    +{simulationResult.metrics.netIncreaseInCriticalItems} items
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h5 className="text-xs font-bold text-slate-700 uppercase mb-2">
                  Newly Endangered Pharmaceuticals:
                </h5>
                {simulationResult.newlyEndangeredItems?.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} /> Network buffers absorb this shock without additional immediate stockouts.
                  </div>
                ) : (
                  <div className="endangered-list">
                    {simulationResult.newlyEndangeredItems.map(item => (
                      <div key={item.inventoryId} className="endangered-item">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-slate-900">{item.medicineName}</span>
                            <div className="text-xs text-slate-600">{item.facilityName}</div>
                          </div>
                          <span className="badge-risk-delta">+{item.scoreDelta} Risk Score</span>
                        </div>
                        <div className="text-xs text-red mt-1">
                          Cause: {item.primaryCause}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Sliders size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Select a preset scenario above or adjust sliders and click Run to compute supply shock impacts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
