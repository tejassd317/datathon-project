import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { generateInventoryForecasts } from '../services/forecastingService.js';
import { prioritizeInventoryRisks } from '../services/riskService.js';
import { optimizeRedistribution } from '../services/redistributionService.js';
import { generateActionableRecommendations } from '../services/recommendationService.js';
import { generateInventoryCSV, generateAssessmentMarkdownReport } from '../services/reportService.js';

export const reportRouter = Router();

reportRouter.get('/download-csv', (req, res) => {
  try {
    const facilities = store.getFacilities();
    const medicines = store.getMedicines();
    const inventory = store.getInventory();
    const scenario = store.getCurrentScenario();

    const forecasts = generateInventoryForecasts(inventory, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0
    });
    const risks = prioritizeInventoryRisks(forecasts, medicines, facilities);

    const csvContent = generateInventoryCSV(inventory, medicines, facilities, forecasts, risks);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="MediReach_AI_Inventory_Assessment.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/download-markdown', (req, res) => {
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
    const redistributionRecommendations = optimizeRedistribution({
      inventory,
      medicines,
      facilities,
      routes,
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

    const markdown = generateAssessmentMarkdownReport({
      summary: {
        totalFacilities: facilities.length,
        totalMedicines: medicines.length
      },
      risks,
      recommendations: actionableRecommendations,
      disruptions: { metrics: { netIncreaseInCriticalItems: 0 } },
      scenario
    });

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="MediReach_AI_Assessment_Report.md"');
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

reportRouter.get('/assessment', (req, res) => {
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
    const redistributionRecommendations = optimizeRedistribution({
      inventory,
      medicines,
      facilities,
      routes,
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

    const markdown = generateAssessmentMarkdownReport({
      summary: {
        totalFacilities: facilities.length,
        totalMedicines: medicines.length
      },
      risks,
      recommendations: actionableRecommendations,
      disruptions: { metrics: { netIncreaseInCriticalItems: 0 } },
      scenario
    });

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      timestamp: new Date().toISOString(),
      scenario,
      summary: {
        totalFacilities: facilities.length,
        totalMedicines: medicines.length,
        criticalStockoutsCount: risks.filter(r => r.riskTier === 'CRITICAL').length,
        highRiskCount: risks.filter(r => r.riskTier === 'HIGH').length,
        feasibleTransfersCount: redistributionRecommendations.filter(r => r.feasibility.isFeasible).length
      },
      risks,
      recommendations: actionableRecommendations,
      markdown
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
