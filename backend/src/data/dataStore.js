/**
 * MediReach AI - In-Memory Data Store
 * Universal JSON file loader and runtime state manager.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadJSON(filename) {
  const filePath = path.join(__dirname, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

class DataStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.facilities = loadJSON('facilities.json');
    this.medicines = loadJSON('medicines.json');
    this.inventory = loadJSON('inventory.json');
    this.routes = loadJSON('transitRoutes.json');
    this.transfers = [];
    this.currentScenario = {
      name: "Standard Baseline Operations",
      supplierDelayDays: 0,
      consumptionMultiplier: 1.0,
      blockedRouteIds: [],
      isolatedFacilityId: null
    };
  }

  getFacilities() {
    return this.facilities;
  }

  getMedicines() {
    return this.medicines;
  }

  getInventory() {
    return this.inventory;
  }

  getRoutes() {
    return this.routes;
  }

  getTransfers() {
    return this.transfers;
  }

  getCurrentScenario() {
    return this.currentScenario;
  }

  setCurrentScenario(scenario) {
    this.currentScenario = { ...this.currentScenario, ...scenario };
  }

  executeTransfer({ recommendationId, donorFacilityId, recipientFacilityId, medicineId, quantity, approverName, notes }) {
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      throw new Error("Invalid transfer quantity");
    }

    const donorItem = this.inventory.find(
      i => i.facilityId === donorFacilityId && i.medicineId === medicineId
    );
    const recipientItem = this.inventory.find(
      i => i.facilityId === recipientFacilityId && i.medicineId === medicineId
    );

    if (!donorItem) {
      throw new Error("Donor facility inventory record not found");
    }
    if (!recipientItem) {
      throw new Error("Recipient facility inventory record not found");
    }

    // Zero-harm safety constraint: Donor cannot drop below safety threshold
    if (donorItem.currentStock - qty < donorItem.safetyStockThreshold) {
      throw new Error(`Transfer of ${qty} units would breach donor safety stock threshold (${donorItem.safetyStockThreshold}). Transfer rejected.`);
    }

    // Execute transfer
    donorItem.currentStock -= qty;
    recipientItem.currentStock += qty;

    const record = {
      transferId: `TRX-${Date.now()}`,
      recommendationId,
      donorFacilityId,
      recipientFacilityId,
      medicineId,
      quantity: qty,
      approverName: approverName || 'Authorized Supply Officer',
      approvedAt: new Date().toISOString(),
      status: 'APPROVED_AND_EXECUTED',
      notes: notes || 'Emergency inter-facility stock rebalancing'
    };

    this.transfers.unshift(record);
    return record;
  }
}

export const store = new DataStore();
