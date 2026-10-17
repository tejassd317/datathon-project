import { Router } from 'express';
import { store } from '../data/dataStore.js';
import { generateInventoryForecasts } from '../services/forecastingService.js';
import { prioritizeInventoryRisks } from '../services/riskService.js';

export const inventoryRouter = Router();

inventoryRouter.get('/', (req, res) => {
  try {
    const { facilityId, medicineId, riskTier } = req.query;
    const facilities = store.getFacilities();
    const medicines = store.getMedicines();
    let inventory = store.getInventory();
    const scenario = store.getCurrentScenario();

    const forecasts = generateInventoryForecasts(inventory, {
      supplierDelayDays: scenario.supplierDelayDays || 0,
      consumptionMultiplier: scenario.consumptionMultiplier || 1.0
    });
    const risks = prioritizeInventoryRisks(forecasts, medicines, facilities);

    const medMap = new Map(medicines.map(m => [m.id, m]));
    const facMap = new Map(facilities.map(f => [f.id, f]));
    const fcMap = new Map(forecasts.map(fc => [fc.inventoryId, fc]));
    const riskMap = new Map(risks.map(r => [r.inventoryId, r]));

    let items = inventory.map(item => {
      const med = medMap.get(item.medicineId) || {};
      const fac = facMap.get(item.facilityId) || {};
      const fc = fcMap.get(item.inventoryId) || {};
      const rk = riskMap.get(item.inventoryId) || {};

      return {
        ...item,
        facilityName: fac.name,
        facilityType: fac.type,
        district: fac.district,
        facilityColdChain: fac.hasColdChain,
        medicineName: med.name,
        dosage: med.dosage,
        category: med.category,
        criticality: med.criticality,
        requiresColdChain: med.requiresColdChain,
        temperatureRange: med.temperatureRange,
        unit: med.unit,
        clinicalIndication: med.clinicalIndication,
        effectiveDailyConsumption: fc.effectiveDailyConsumption,
        daysUntilStockout: fc.daysUntilCurrentStockout,
        daysUntilSafetyBreach: fc.daysUntilSafetyBreach,
        forecastStatus: fc.status,
        forecastSeverity: fc.statusSeverity,
        riskScore: rk.compositeScore,
        riskTier: rk.riskTier,
        riskBadgeColor: rk.badgeColor,
        riskFactors: rk.factors
      };
    });

    if (facilityId) {
      items = items.filter(i => i.facilityId === facilityId);
    }
    if (medicineId) {
      items = items.filter(i => i.medicineId === medicineId);
    }
    if (riskTier) {
      items = items.filter(i => i.riskTier === riskTier.toUpperCase());
    }

    res.json({
      success: true,
      dataNotice: "SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII",
      count: items.length,
      inventory: items
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

inventoryRouter.get('/facilities', (req, res) => {
  res.json({ success: true, facilities: store.getFacilities() });
});

inventoryRouter.get('/medicines', (req, res) => {
  res.json({ success: true, medicines: store.getMedicines() });
});

inventoryRouter.post('/reset', (req, res) => {
  store.reset();
  res.json({ success: true, message: 'Inventory reset to initial baseline demo dataset' });
});
