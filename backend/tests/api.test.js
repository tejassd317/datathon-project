import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

describe('MediReach AI - Backend REST API Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/health returns healthy status and metadata', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'HEALTHY');
    assert.equal(data.service, 'MediReach AI - Supply Chain Engine');
  });

  test('GET /api/dashboard/summary returns KPIs and facilities overview', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/summary`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.summary.totalFacilities >= 3);
    assert.ok(data.summary.totalMedicines >= 5);
    assert.ok(data.summary.pendingAlertsCount > 0);
  });

  test('GET /api/inventory returns full list with calculated risk and stockout metrics', async () => {
    const res = await fetch(`${baseUrl}/api/inventory`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.inventory.length > 0);

    const firstItem = data.inventory[0];
    assert.ok(firstItem.facilityName);
    assert.ok(firstItem.medicineName);
    assert.ok(typeof firstItem.daysUntilStockout === 'number');
    assert.ok(typeof firstItem.riskScore === 'number');
    assert.ok(firstItem.riskTier);
  });

  test('POST /api/disruption/simulate runs scenario and recalculates risk deltas', async () => {
    const res = await fetch(`${baseUrl}/api/disruption/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierDelayDays: 10,
        consumptionMultiplier: 1.5,
        blockedRouteIds: ['ROUTE-001']
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.simulationResult.simulatedForecasts.length > 0);
    assert.equal(data.simulationResult.scenarioApplied.supplierDelayDays, 10);
  });

  test('GET /api/redistribution/recommendations returns explainable transfer proposals', async () => {
    const res = await fetch(`${baseUrl}/api/redistribution/recommendations`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.redistributionRecommendations));
    assert.ok(Array.isArray(data.actionableRecommendations));
  });

  test('POST /api/transfers/approve executes stock adjustment with audit log', async () => {
    // Attempt valid transfer
    const res = await fetch(`${baseUrl}/api/transfers/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId: 'REC-TEST-APPROVAL',
        donorFacilityId: 'FAC-004',
        recipientFacilityId: 'FAC-001',
        medicineId: 'MED-001',
        quantity: 15,
        approverName: 'Dr. Jane Muthoni (Pharmacist)',
        notes: 'Clinical emergency approval'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.transfer.status, 'APPROVED_AND_EXECUTED');
    assert.equal(data.transfer.quantity, 15);
  });

  test('POST /api/transfers/approve rejects transfer violating donor safety stock', async () => {
    // Attempt excessive transfer of 100,000 units
    const res = await fetch(`${baseUrl}/api/transfers/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recommendationId: 'REC-OVERDRAFT',
        donorFacilityId: 'FAC-004',
        recipientFacilityId: 'FAC-001',
        medicineId: 'MED-001',
        quantity: 999999,
        approverName: 'Hacker'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.error.includes('safety stock threshold'));
  });

  test('GET /api/reports/download-csv returns valid CSV format', async () => {
    const res = await fetch(`${baseUrl}/api/reports/download-csv`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.startsWith('Inventory ID,Facility ID'));
  });
});
