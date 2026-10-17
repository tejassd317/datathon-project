import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { simulateDisruption, PRESET_SCENARIOS } from '../services/disruptionService.js';

export const disruptionRouter = Router();

disruptionRouter.get('/presets', (req, res) => {
  res.json({
    success: true,
    presets: Object.values(PRESET_SCENARIOS)
  });
});

disruptionRouter.get('/current', (req, res) => {
  res.json({
    success: true,
    currentScenario: store.getCurrentScenario()
  });
});

disruptionRouter.post('/simulate', (req, res) => {
  try {
    const {
      name,
      supplierDelayDays = 0,
      consumptionMultiplier = 1.0,
      blockedRouteIds = [],
      isolatedFacilityId = null,
      persist = true
    } = req.body;

    const inventory = store.getInventory();
    const medicines = store.getMedicines();
    const facilities = store.getFacilities();
    const routes = store.getRoutes();

    const scenario = {
      name: name || `Custom Disruption (+${supplierDelayDays}d delay, ${consumptionMultiplier}x demand)`,
      supplierDelayDays: Number(supplierDelayDays) || 0,
      consumptionMultiplier: Number(consumptionMultiplier) || 1.0,
      blockedRouteIds: Array.isArray(blockedRouteIds) ? blockedRouteIds : [],
      isolatedFacilityId: isolatedFacilityId || null
    };

    if (persist) {
      store.setCurrentScenario(scenario);
    }

    const simulationResult = simulateDisruption({
      inventory,
      medicines,
      facilities,
      routes,
      scenario
    });

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      scenario,
      simulationResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
