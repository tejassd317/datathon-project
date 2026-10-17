import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { api } from '../services/api';
import { TrendingDown, Calendar, ShieldCheck, AlertCircle, Info, Sparkles } from 'lucide-react';

export function ForecastChart({ inventoryId, onClose }) {
  const [horizon, setHorizon] = useState(30);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!inventoryId) return;
    let isMounted = true;
    setLoading(true);

    api.getForecastDetail(inventoryId, horizon)
      .then(res => {
        if (isMounted) {
          setForecastData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [inventoryId, horizon]);

  if (!inventoryId) return null;

  return (
    <div className="forecast-chart-container card-panel">
      <div className="panel-header">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="panel-title text-lg">Demand & Stockout Trajectory Prediction</h3>
            <span className="badge-model-type">
              <Sparkles size={12} /> Deterministic Run-Rate Heuristic
            </span>
          </div>
          {forecastData && (
            <p className="panel-subtitle">
              <strong>{forecastData.medicine?.name}</strong> at <em>{forecastData.facility?.name}</em> ({forecastData.facility?.district})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="horizon-toggle-group">
            {[7, 14, 30].map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`horizon-btn ${horizon === h ? 'active' : ''}`}
              >
                {h} Days
              </button>
            ))}
          </div>
          {onClose && (
            <button onClick={onClose} className="close-btn" title="Close forecast view">✕</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="chart-loading py-16 text-center text-muted">Calculating forecast trajectory...</div>
      ) : error ? (
        <div className="chart-error py-12 text-center text-red">Failed to load forecast: {error}</div>
      ) : forecastData ? (
        <div>
          {/* Summary KPI Strip */}
          <div className="forecast-kpi-strip">
            <div className="kpi-mini">
              <span className="kpi-mini-label">Current Stock</span>
              <span className="kpi-mini-value font-mono">{forecastData.forecast.currentStock} {forecastData.medicine?.unit}</span>
            </div>
            <div className="kpi-mini">
              <span className="kpi-mini-label">Avg Daily Burn</span>
              <span className="kpi-mini-value font-mono">{forecastData.forecast.effectiveDailyConsumption} /day</span>
            </div>
            <div className="kpi-mini">
              <span className="kpi-mini-label">Days to Zero Stock</span>
              <span className={`kpi-mini-value font-mono ${forecastData.forecast.daysUntilCurrentStockout <= 3 ? 'text-red font-bold' : ''}`}>
                {forecastData.forecast.daysUntilCurrentStockout} days
              </span>
            </div>
            <div className="kpi-mini">
              <span className="kpi-mini-label">Safety Threshold</span>
              <span className="kpi-mini-value font-mono">{forecastData.forecast.safetyThreshold} units</span>
            </div>
            <div className="kpi-mini">
              <span className="kpi-mini-label">Next Delivery Arrival</span>
              <span className="kpi-mini-value font-mono">
                {forecastData.forecast.pendingOrderQuantity > 0 
                  ? `Day ${forecastData.forecast.effectivePendingDays} (+${forecastData.forecast.pendingOrderQuantity})` 
                  : 'None scheduled'}
              </span>
            </div>
          </div>

          {/* Interactive Recharts Area */}
          <div className="chart-wrapper" style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData.forecast.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  tickFormatter={(d) => `Day ${d}`} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  label={{ value: `Units (${forecastData.medicine?.unit || 'units'})`, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(val, name) => [
                    `${val} ${forecastData.medicine?.unit || 'units'}`, 
                    name === 'projectedStock' ? 'Projected Inventory' : name
                  ]}
                  labelFormatter={(day) => `Forecast Day ${day}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <ReferenceLine 
                  y={forecastData.forecast.safetyThreshold} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  label={{ value: `Safety Threshold (${forecastData.forecast.safetyThreshold})`, fill: '#ef4444', fontSize: 11, position: 'right' }} 
                />
                {forecastData.forecast.firstStockoutDay && (
                  <ReferenceLine 
                    x={forecastData.forecast.firstStockoutDay} 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    label={{ value: `Stockout Day ${forecastData.forecast.firstStockoutDay}`, fill: '#dc2626', fontSize: 11, position: 'top' }}
                  />
                )}
                {forecastData.forecast.pendingOrderQuantity > 0 && forecastData.forecast.effectivePendingDays <= horizon && (
                  <ReferenceLine 
                    x={forecastData.forecast.effectivePendingDays} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    label={{ value: `Shipment Arrives (+${forecastData.forecast.pendingOrderQuantity})`, fill: '#059669', fontSize: 11, position: 'insideTopRight' }}
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="projectedStock" 
                  stroke="#0284c7" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#stockGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-footer-notice">
            <Info size={14} className="text-sky-600 mt-0.5" />
            <div>
              <strong>Calculation Methodology Transparency:</strong> Forecast computed using deterministic daily run-rate burn formula: <em>Stock(t) = max(0, Stock(t-1) - Rate + Inflow(t))</em>.
              No unvalidated ML claims. Inflow represents verified supplier purchase orders.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
