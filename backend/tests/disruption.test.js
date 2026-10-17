import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { simulateDisruption } from '../src/services/disruptionService.js';

describe('Disruption Simulator - Delay, Road Closure & Demand Surges', () => {
  const dummyInventory = [
    {
      inventoryId: 'INV-TEST-A',
      facilityId: 'FAC-A',
      medicineId: 'MED-1',
      currentStock: 40,
      averageDailyConsumption: 5,
      safetyStockThreshold: 20,
      pendingOrderQuantity: 50,
      pendingOrderDaysRemaining: 4,
      leadTimeDays: 7
    },
    {
      inventoryId: 'INV-TEST-B',
      facilityId: 'FAC-B',
      medicineId: 'MED-1',
      currentStock: 10,
      averageDailyConsumption: 4,
      safetyStockThreshold: 15,
      pendingOrderQuantity: 20,
      pendingOrderDaysRemaining: 5,
      leadTimeDays: 6
    }
  ];

  const dummyMedicines = [
    { id: 'MED-1', name: 'Oxytocin', criticality: 10, requiresColdChain: true, unit: 'ampoules' }
  ];

  const dummyFacilities = [
    { id: 'FAC-A', name: 'Regional Depot', type: 'Depot', hasColdChain: true, location: { accessibilityRating: 'Tarmac' } },
    { id: 'FAC-B', name: 'Remote Clinic', type: 'Dispensary', hasColdChain: true, location: { accessibilityRating: 'Isolated Rough Track' } }
  ];

  const dummyRoutes = [
    { routeId: 'ROUTE-AB', fromFacilityId: 'FAC-A', toFacilityId: 'FAC-B', isPassable: true, hasColdChainVehicleSupport: true, normalTransitHours: 2 }
  ];

  test('simulates supplier delay and increases pending delivery lag', () => {
    const result = simulateDisruption({
      inventory: dummyInventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes: dummyRoutes,
      scenario: { supplierDelayDays: 8 }
    });

    const itemB = result.simulatedForecasts.find(f => f.inventoryId === 'INV-TEST-B');
    // Original pending was 5, with +8 days delay it is now 13 days
    assert.equal(itemB.effectivePendingDays, 13);
    assert.equal(itemB.status, 'REPLENISHMENT_LAG');
  });

  test('simulates road closure and marks route as impassable', () => {
    const result = simulateDisruption({
      inventory: dummyInventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes: dummyRoutes,
      scenario: { blockedRouteIds: ['ROUTE-AB'] }
    });

    const route = result.updatedRoutes.find(r => r.routeId === 'ROUTE-AB');
    assert.equal(route.isPassable, false);
    assert.equal(route.disruptionActive, true);
    assert.equal(result.metrics.blockedRoutesCount, 1);
  });

  test('simulates disease outbreak demand surge and identifies newly endangered items', () => {
    const result = simulateDisruption({
      inventory: dummyInventory,
      medicines: dummyMedicines,
      facilities: dummyFacilities,
      routes: dummyRoutes,
      scenario: { consumptionMultiplier: 2.0 }
    });

    const itemB = result.simulatedForecasts.find(f => f.inventoryId === 'INV-TEST-B');
    // 10 units / (4 * 2) = 1.2 days
    assert.equal(itemB.effectiveDailyConsumption, 8);
    assert.equal(itemB.daysUntilCurrentStockout, 1.3); // (10 / 8 = 1.25 -> 1.3)
    assert.ok(result.metrics.simulatedCriticalCount >= result.metrics.baselineCriticalCount);
  });
});
