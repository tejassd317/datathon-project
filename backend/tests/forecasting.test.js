import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStockoutMetrics } from '../src/services/forecastingService.js';

describe('Forecasting Service - Baseline Stockout & Demand Projections', () => {
  const sampleItem = {
    inventoryId: 'TEST-INV-001',
    facilityId: 'FAC-001',
    medicineId: 'MED-001',
    currentStock: 30,
    averageDailyConsumption: 10,
    safetyStockThreshold: 15,
    pendingOrderQuantity: 50,
    pendingOrderDaysRemaining: 5,
    leadTimeDays: 7
  };

  test('calculates correct days until current stockout', () => {
    const result = calculateStockoutMetrics(sampleItem);
    // 30 units / 10 units per day = 3.0 days
    assert.equal(result.daysUntilCurrentStockout, 3.0);
  });

  test('calculates correct days until safety stock breach', () => {
    const result = calculateStockoutMetrics(sampleItem);
    // Current 30 - Safety 15 = 15 surplus units; 15 / 10 = 1.5 days
    assert.equal(result.daysUntilSafetyBreach, 1.5);
  });

  test('identifies replenishment lag when arrival day is after stockout day', () => {
    // Current stockout in 3 days, but pending order arrives in 5 days
    const result = calculateStockoutMetrics(sampleItem);
    assert.equal(result.stockoutDeficitDays, 2.0); // 5 - 3 = 2 days deficit
    assert.equal(result.status, 'REPLENISHMENT_LAG');
    assert.equal(result.statusSeverity, 'DANGER');
  });

  test('accurately factors in demand surge multiplier', () => {
    // Outbreak surge 2.0x -> daily burn = 20 units/day
    const result = calculateStockoutMetrics(sampleItem, { consumptionMultiplier: 2.0 });
    assert.equal(result.effectiveDailyConsumption, 20.0);
    // 30 / 20 = 1.5 days
    assert.equal(result.daysUntilCurrentStockout, 1.5);
  });

  test('handles zero consumption gracefully without division by zero', () => {
    const zeroItem = { ...sampleItem, averageDailyConsumption: 0 };
    const result = calculateStockoutMetrics(zeroItem);
    assert.equal(result.daysUntilCurrentStockout, 999);
    assert.equal(result.status, 'ADEQUATE');
  });

  test('projects trajectory over 30 days and records arrival day replenishment', () => {
    const result = calculateStockoutMetrics(sampleItem, { horizonDays: 10 });
    assert.equal(result.timeline.length, 10);

    // Day 1: start 30, burn 10 -> projected 20
    assert.equal(result.timeline[0].projectedStock, 20);

    // Day 5: pending order of 50 arrives!
    const day5 = result.timeline[4];
    assert.equal(day5.inflow, 50);
  });
});
