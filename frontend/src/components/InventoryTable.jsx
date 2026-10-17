import React, { useState } from 'react';
import { Search, Filter, Snowflake, AlertTriangle, Clock, TrendingDown, ArrowRightCircle } from 'lucide-react';

export function InventoryTable({ inventory, facilities, medicines, onSelectForecast, selectedInventoryId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const filtered = inventory.filter(item => {
    const matchesSearch = 
      item.medicineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.facilityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clinicalIndication?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFacility = selectedFacility === 'ALL' || item.facilityId === selectedFacility;
    const matchesRisk = selectedRisk === 'ALL' || item.riskTier === selectedRisk;

    return matchesSearch && matchesFacility && matchesRisk;
  });

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Rural Facility Medicine Inventory</h2>
          <p className="panel-subtitle">
            Monitored stock levels, daily consumption burn rates, lead times and batch expiry across rural network nodes.
          </p>
        </div>

        <div className="filter-controls">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search medicine, health centre, indication..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select 
            value={selectedFacility} 
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Health Facilities ({facilities.length})</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select 
            value={selectedRisk} 
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">Critical Risk Only</option>
            <option value="HIGH">High Risk Only</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Health Centre</th>
              <th>Critical Medicine</th>
              <th>Current Stock / Safety</th>
              <th>Avg Daily Burn</th>
              <th>Est. Days to Stockout</th>
              <th>Pending Order (Lead Time)</th>
              <th>Earliest Expiry</th>
              <th>Risk Tier</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-muted">
                  No inventory records match the selected search and filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const isSelected = selectedInventoryId === item.inventoryId;
                const isBreached = item.currentStock < item.safetyStockThreshold;
                const percentOfSafety = Math.min(100, Math.round((item.currentStock / item.safetyStockThreshold) * 100));

                const earliestBatch = item.batches && item.batches.length > 0 
                  ? item.batches[0] 
                  : null;

                return (
                  <tr key={item.inventoryId} className={isSelected ? 'row-selected' : ''}>
                    <td>
                      <div className="font-semibold text-slate-800">{item.facilityName}</div>
                      <div className="text-xs text-slate-500">{item.district} | {item.facilityType}</div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{item.medicineName}</span>
                        {item.requiresColdChain && (
                          <span className="cold-chain-pill" title={`Cold Chain Required (${item.temperatureRange})`}>
                            <Snowflake size={12} /> {item.temperatureRange}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{item.dosage} • {item.clinicalIndication}</div>
                    </td>

                    <td>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-mono font-bold ${isBreached ? 'text-red font-bold' : 'text-slate-700'}`}>
                          {item.currentStock} {item.unit}
                        </span>
                        <span className="text-muted">Threshold: {item.safetyStockThreshold}</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className={`progress-bar-fill ${isBreached ? 'fill-danger' : 'fill-success'}`}
                          style={{ width: `${percentOfSafety}%` }}
                        />
                      </div>
                    </td>

                    <td>
                      <span className="font-mono text-sm">{item.effectiveDailyConsumption}</span>
                      <span className="text-xs text-slate-500"> /day</span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className={`stockout-badge stockout-${item.forecastSeverity?.toLowerCase() || 'normal'}`}>
                          {item.daysUntilStockout <= 0 ? 'Exhausted' : `${item.daysUntilStockout} days`}
                        </span>
                      </div>
                      {item.daysUntilStockout <= (item.pendingOrderDaysRemaining || item.leadTimeDays) && item.pendingOrderQuantity > 0 && (
                        <div className="text-[11px] text-red mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={11} /> Stockout before delivery
                        </div>
                      )}
                    </td>

                    <td>
                      {item.pendingOrderQuantity > 0 ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-slate-700">+{item.pendingOrderQuantity} {item.unit}</span>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={11} /> Arrives in {item.pendingOrderDaysRemaining || item.leadTimeDays}d (LT: {item.leadTimeDays}d)
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">No order active</span>
                      )}
                    </td>

                    <td>
                      {earliestBatch ? (
                        <div>
                          <span className="font-mono text-xs text-slate-700">{earliestBatch.expiryDate}</span>
                          <div className="text-[11px] text-slate-400">Lot: {earliestBatch.batchNo}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">No batch info</span>
                      )}
                    </td>

                    <td>
                      <span className={`risk-badge badge-${item.riskTier?.toLowerCase() || 'low'}`}>
                        {item.riskTier} ({item.riskScore})
                      </span>
                    </td>

                    <td>
                      <button 
                        onClick={() => onSelectForecast(item.inventoryId)}
                        className={`action-btn-inspect ${isSelected ? 'active' : ''}`}
                        title="View 7-30 day demand forecast chart"
                      >
                        <TrendingDown size={14} /> Forecast
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
