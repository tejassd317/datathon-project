import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeRedistribution } from '../src/services/redistributionService.js';
import { generateInventoryForecasts } from '../src/services/forecastingService.js';
import { prioritizeInventoryRisks } from '../src/services/riskService.js';

describe('Redistribution Optimizer - Constraints & Cold-Chain Feasibility', () => {
  const dummyMedicines = [
    { id: 'MED-COLD', name: 'Oxytocin', requiresColdChain: true, temperatureRange: '2-8°C', criticality: 10, unit: 'ampoules' },
    { id: 'MED-ROOM', name: 'Amoxicillin', requiresColdChain: false, temperatureRange: '15-25°C', criticality: 8, unit: 'packs' }
  ];

  const dummyFacilities = [
    { id: 'FAC-DONOR', name: 'Central Depot', hasColdChain: true, location: { accessibilityRating: 'Tarmac' } },
    { id: 'FAC-RECIP-COLD', name: 'Remote Clinic Cold-Ready', hasColdChain: true, location: { accessibilityRating: 'Vulnerable' } },
    { id: 'FAC-RECIP-NO-COLD', name: 'Desert Post No-Fridge', hasColdChain: false, location: { accessibilityRating: 'Isolated' } }
  ];

  test('enforces zero-harm constraint: donor stock remains above safety threshold', () => {
    const inventory = [
      {
        inventoryId: 'INV-1',
        facilityId: 'FAC-DONOR',
        medicineId: 'MED-ROOM',
        currentStock: 100,
        safetyStockThreshold: 40,
        averageDailyConsumption: 5,
        batches: [{ batchNo: 'B1', expiryDate: '2027-12-01', quantity: 100 }]
      },
      {
        inventoryId: 'INV-2',
        facilityId: 'FAC-RECIP-COLD',
        medicineId: 'MED-ROOM',
        currentStock: 5,
        safetyStockThreshold: 30,
        averageDailyConsumption: 10,
        batches: [{ batchNo: 'B2', expiryDate: '2027-12-01', quantity: 5 }]
      }
    ];

    const routes = [
      { routeId: 'R1', fromFacilityId: 'FAC-DONOR', toFacilityId: 'FAC-RECIP-COLD', isPassable: true, hasColdChainVehicleSupport: true, normalTransitHours: 2 }
    ];

    const forecasts = generateInventoryForecasts(inventory);
    const risks = prioritizeInventoryRisks(forecasts, dummyMedicines, dummyFacilities);

    const recs = optimizeRedistribution({
      inventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes,
      forecasts,
      risks
    });

    assert.ok(recs.length > 0);
    const rec = recs[0];
    assert.equal(rec.feasibility.isFeasible, true);

    // Verify donor buffer: remaining stock must be >= safety threshold
    assert.ok(rec.donorFacility.stockAfterTransfer >= rec.donorFacility.safetyThreshold);
    assert.ok(rec.transferDetails.recommendedQuantity > 0);
  });

  test('flags cold-chain incompatibility when route lacks refrigerated vehicle', () => {
    const inventory = [
      {
        inventoryId: 'INV-1',
        facilityId: 'FAC-DONOR',
        medicineId: 'MED-COLD',
        currentStock: 200,
        safetyStockThreshold: 50,
        averageDailyConsumption: 5,
        batches: [{ batchNo: 'O1', expiryDate: '2027-05-01', quantity: 200 }]
      },
      {
        inventoryId: 'INV-2',
        facilityId: 'FAC-RECIP-COLD',
        medicineId: 'MED-COLD',
        currentStock: 3,
        safetyStockThreshold: 20,
        averageDailyConsumption: 3,
        batches: [{ batchNo: 'O2', expiryDate: '2027-05-01', quantity: 3 }]
      }
    ];

    // Route has NO cold chain vehicle support!
    const routes = [
      { routeId: 'R1', fromFacilityId: 'FAC-DONOR', toFacilityId: 'FAC-RECIP-COLD', isPassable: true, hasColdChainVehicleSupport: false, normalTransitHours: 3 }
    ];

    const forecasts = generateInventoryForecasts(inventory);
    const risks = prioritizeInventoryRisks(forecasts, dummyMedicines, dummyFacilities);

    const recs = optimizeRedistribution({
      inventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes,
      forecasts,
      risks
    });

    assert.ok(recs.length > 0);
    const rec = recs[0];
    assert.equal(rec.feasibility.isFeasible, false);
    assert.equal(rec.feasibility.status, 'COLD_CHAIN_UNSUPPORTED');
  });

  test('flags impassable blocked routes', () => {
    const inventory = [
      {
        inventoryId: 'INV-1',
        facilityId: 'FAC-DONOR',
        medicineId: 'MED-ROOM',
        currentStock: 100,
        safetyStockThreshold: 40,
        averageDailyConsumption: 5,
        batches: [{ batchNo: 'B1', expiryDate: '2027-12-01', quantity: 100 }]
      },
      {
        inventoryId: 'INV-2',
        facilityId: 'FAC-RECIP-COLD',
        medicineId: 'MED-ROOM',
        currentStock: 2,
        safetyStockThreshold: 25,
        averageDailyConsumption: 8,
        batches: [{ batchNo: 'B2', expiryDate: '2027-12-01', quantity: 2 }]
      }
    ];

    // Route is blocked
    const routes = [
      { routeId: 'R1', fromFacilityId: 'FAC-DONOR', toFacilityId: 'FAC-RECIP-COLD', isPassable: false, hasColdChainVehicleSupport: true, normalTransitHours: 2 }
    ];

    const forecasts = generateInventoryForecasts(inventory);
    const risks = prioritizeInventoryRisks(forecasts, dummyMedicines, dummyFacilities);

    const recs = optimizeRedistribution({
      inventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes,
      forecasts,
      risks
    });

    assert.ok(recs.length > 0);
    const rec = recs[0];
    assert.equal(rec.feasibility.isFeasible, false);
    assert.equal(rec.feasibility.status, 'ROUTE_BLOCKED');
  });

  test('excludes donor batches expiring within 30 days', () => {
    const today = new Date();
    const soonDate = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 10 days from now

    const inventory = [
      {
        inventoryId: 'INV-1',
        facilityId: 'FAC-DONOR',
        medicineId: 'MED-ROOM',
        currentStock: 100,
        safetyStockThreshold: 40,
        averageDailyConsumption: 5,
        batches: [{ batchNo: 'EXPIRED-SOON', expiryDate: soonDate, quantity: 100 }]
      },
      {
        inventoryId: 'INV-2',
        facilityId: 'FAC-RECIP-COLD',
        medicineId: 'MED-ROOM',
        currentStock: 2,
        safetyStockThreshold: 25,
        averageDailyConsumption: 8,
        batches: [{ batchNo: 'B2', expiryDate: '2027-12-01', quantity: 2 }]
      }
    ];

    const routes = [
      { routeId: 'R1', fromFacilityId: 'FAC-DONOR', toFacilityId: 'FAC-RECIP-COLD', isPassable: true, hasColdChainVehicleSupport: true, normalTransitHours: 2 }
    ];

    const forecasts = generateInventoryForecasts(inventory);
    const risks = prioritizeInventoryRisks(forecasts, dummyMedicines, dummyFacilities);

    const recs = optimizeRedistribution({
      inventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes,
      forecasts,
      risks
    });

    assert.ok(recs.length > 0);
    const rec = recs[0];
    assert.equal(rec.feasibility.isFeasible, false);
    assert.equal(rec.feasibility.status, 'EXPIRY_UNSUITABLE');
  });
});
