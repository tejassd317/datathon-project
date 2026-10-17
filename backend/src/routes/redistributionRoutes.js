import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { generateInventoryForecasts } from '../services/forecastingService.js';
import { prioritizeInventoryRisks } from '../services/riskService.js';
import { optimizeRedistribution } from '../services/redistributionService.js';
import { generateActionableRecommendations } from '../services/recommendationService.js';

export const redistributionRouter = Router();

redistributionRouter.get('/recommendations', (req, res) => {
  try {
    const inventory = store.getInventory();
    const medicines = store.getMedicines();
    const facilities = store.getFacilities();
    const routes = store.getRoutes();
    const scenario = store.getCurrentScenario();

    const forecasts = generateInventoryForecasts(inventory, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0
    });

    const risks = prioritizeInventoryRisks(forecasts, medicines, facilities);

    // Apply active scenario route passability overrides
    const blockedSet = new Set(scenario.blockedRouteIds || []);
    const activeRoutes = routes.map(r => ({
      ...r,
      isPassable: blockedSet.has(r.routeId) ? false : r.isPassable
    }));

    const redistributionRecommendations = optimizeRedistribution({
      inventory,
      medicines,
      facilities,
      routes: activeRoutes,
      forecasts,
      risks
    });

    const actionableRecommendations = generateActionableRecommendations({
      risks,
      forecasts,
      redistributionRecommendations,
      facilities,
      medicines
    });

    const feasibleCount = redistributionRecommendations.filter(r => r.feasibility.isFeasible).length;
    const constrainedCount = redistributionRecommendations.length - feasibleCount;

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      summary: {
        totalRecommendations: redistributionRecommendations.length,
        feasibleTransfersCount: feasibleCount,
        constrainedTransfersCount: constrainedCount,
        actionableAlertsCount: actionableRecommendations.length
      },
      redistributionRecommendations,
      actionableRecommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
