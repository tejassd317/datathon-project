import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { calculateStockoutMetrics, generateInventoryForecasts } from '../services/forecastingService.js';

export const forecastRouter = Router();

forecastRouter.get('/', (req, res) => {
  try {
    const horizon = Number(req.query.horizonDays) || 30;
    const inventory = store.getInventory();
    const scenario = store.getCurrentScenario();

    const forecasts = generateInventoryForecasts(inventory, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0,
      horizonDays: horizon
    });

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      horizonDays: horizon,
      forecastingMethod: "Deterministic Run-Rate Trajectory (Baseline Heuristic)",
      forecasts
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

forecastRouter.get('/:inventoryId', (req, res) => {
  try {
    const { inventoryId } = req.params;
    const horizon = Number(req.query.horizonDays) || 30;
    const item = store.getInventory().find(i => i.inventoryId === inventoryId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory record not found' });
    }

    const scenario = store.getCurrentScenario();
    const forecast = calculateStockoutMetrics(item, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0,
      horizonDays: horizon
    });

    const medicine = store.getMedicines().find(m => m.id === item.medicineId);
    const facility = store.getFacilities().find(f => f.id === item.facilityId);

    res.json({
      success: true,
      medicine,
      facility,
      forecast
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
