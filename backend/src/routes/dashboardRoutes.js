import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { generateInventoryForecasts } from '../services/forecastingService.js';
import { prioritizeInventoryRisks } from '../services/riskService.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (req, res) => {
  try {
    const facilities = store.getFacilities();
    const medicines = store.getMedicines();
    const inventory = store.getInventory();
    const routes = store.getRoutes();
    const scenario = store.getCurrentScenario();

    const forecasts = generateInventoryForecasts(inventory, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0
    });

    const risks = prioritizeInventoryRisks(forecasts, medicines, facilities);

    const criticalStockouts = risks.filter(r => r.riskTier === 'CRITICAL');
    const highRisks = risks.filter(r => r.riskTier === 'HIGH');
    const mediumRisks = risks.filter(r => r.riskTier === 'MEDIUM');

    const facilitiesWithColdChain = facilities.filter(f => f.hasColdChain).length;
    const passableRoutesCount = routes.filter(r => r.isPassable).length;

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      summary: {
        totalFacilities: facilities.length,
        totalMedicines: medicines.length,
        totalInventoryRecords: inventory.length,
        criticalStockoutsCount: criticalStockouts.length,
        highRiskCount: highRisks.length,
        pendingAlertsCount: criticalStockouts.length + highRisks.length,
        coldChainFacilitiesCount: facilitiesWithColdChain,
        passableRoutesCount,
        totalRoutesCount: routes.length,
        activeScenario: scenario.name
      },
      topCriticalAlerts: criticalStockouts.slice(0, 5),
      facilities,
      medicines,
      routes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
