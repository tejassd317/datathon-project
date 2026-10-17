/**
 * MediReach AI - Supply Disruption Simulator
 * Allows interactive simulation of:
 * - Supplier delivery delays (+N days)
 * - Road closures / impassable routes due to weather or infrastructure collapse
 * - Clinical demand surges (e.g. disease outbreaks, seasonal malaria spikes)
 * - Targeted facility isolation
 */

import { generateInventoryForecasts } from './forecastingService.js';
import { prioritizeInventoryRisks } from './riskService.js';

export const PRESET_SCENARIOS = {
  BASELINE: {
    id: "SCENARIO-BASELINE",
    name: "Standard Baseline Operations",
    description: "Normal scheduled deliveries, all transit corridors open, nominal baseline consumption.",
    supplierDelayDays: 0,
    consumptionMultiplier: 1.0,
    blockedRouteIds: [],
    isolatedFacilityId: null
  },
  MONSOON_LANDSLIDE: {
    id: "SCENARIO-MONSOON",
    name: "Monsoon Landslide & Escarpment Cutoff",
    description: "Heavy rainfall causes mudslides on Baringo Escarpment (Route R-001). +7 days supplier delay and 1.5x malaria treatment surge.",
    supplierDelayDays: 7,
    consumptionMultiplier: 1.5,
    blockedRouteIds: ["ROUTE-001"],
    isolatedFacilityId: null
  },
  SUPPLIER_PORT_BACKLOG: {
    id: "SCENARIO-BACKLOG",
    name: "National Regulatory & Port Clearance Backlog",
    description: "Central medical stores experience +14 days import clearance delays across all pharmaceutical categories.",
    supplierDelayDays: 14,
    consumptionMultiplier: 1.0,
    blockedRouteIds: [],
    isolatedFacilityId: null
  },
  RIVERINE_FLASH_FLOOD: {
    id: "SCENARIO-FLOOD",
    name: "Riverine Flash Flood & Diarrheal Surge",
    description: "River bridge crossing to Marigat Care Post blocked. ORS and pediatric antibiotic consumption spikes to 2.0x.",
    supplierDelayDays: 5,
    consumptionMultiplier: 2.0,
    blockedRouteIds: ["ROUTE-003", "ROUTE-005"],
    isolatedFacilityId: "FAC-003"
  }
};

/**
 * Runs a disruption simulation against the provided dataset.
 * 
 * @param {Object} params
 * @param {Array} params.inventory - Baseline inventory items
 * @param {Array} params.medicines - Medicine master data
 * @param {Array} params.facilities - Facilities master data
 * @param {Array} params.routes - Transit routes
 * @param {Object} params.scenario - Simulation parameters { supplierDelayDays, consumptionMultiplier, blockedRouteIds, isolatedFacilityId }
 * @returns {Object} Simulation results including updated forecasts, route statuses, delta comparison
 */
export function simulateDisruption({ inventory, medicines, facilities, routes, scenario = {} }) {
  const supplierDelayDays = Number(scenario.supplierDelayDays) || 0;
  const consumptionMultiplier = Number(scenario.consumptionMultiplier) || 1.0;
  const blockedRouteIds = new Set(scenario.blockedRouteIds || []);
  const isolatedFacilityId = scenario.isolatedFacilityId || null;

  // 1. Compute baseline (un-disrupted) metrics for comparison
  const baselineForecasts = generateInventoryForecasts(inventory, { supplierDelayDays: 0, consumptionMultiplier: 1.0 });
  const baselineRisks = prioritizeInventoryRisks(baselineForecasts, medicines, facilities);
  const baselineCriticalCount = baselineRisks.filter(r => r.riskTier === 'CRITICAL' || r.riskTier === 'HIGH').length;

  // 2. Compute simulated forecasts with disruption overrides
  const simulatedForecasts = inventory.map(item => {
    // If facility is isolated, incoming orders cannot arrive during simulation horizon
    const effectiveSupplierDelay = (isolatedFacilityId && item.facilityId === isolatedFacilityId)
      ? supplierDelayDays + 60 // Effectively indefinitely delayed
      : supplierDelayDays;

    return generateInventoryForecasts([item], {
      supplierDelayDays: effectiveSupplierDelay,
      consumptionMultiplier: consumptionMultiplier,
      horizonDays: 30
    })[0];
  });

  // 3. Compute new simulated risk scores
  const simulatedRisks = prioritizeInventoryRisks(simulatedForecasts, medicines, facilities);
  const simulatedCriticalCount = simulatedRisks.filter(r => r.riskTier === 'CRITICAL' || r.riskTier === 'HIGH').length;

  // 4. Update route passability status
  const updatedRoutes = routes.map(r => ({
    ...r,
    isPassable: blockedRouteIds.has(r.routeId) ? false : r.isPassable,
    disruptionActive: blockedRouteIds.has(r.routeId)
  }));

  // 5. Delta analysis: which items transitioned to a worse risk state?
  const baselineRiskMap = new Map(baselineRisks.map(r => [r.inventoryId, r]));
  const newlyEndangeredItems = [];

  simulatedRisks.forEach(simRisk => {
    const baseRisk = baselineRiskMap.get(simRisk.inventoryId);
    if (!baseRisk) return;

    const worsened = simRisk.compositeScore > baseRisk.compositeScore + 10 ||
      (baseRisk.riskTier !== 'CRITICAL' && simRisk.riskTier === 'CRITICAL');

    if (worsened) {
      newlyEndangeredItems.push({
        inventoryId: simRisk.inventoryId,
        facilityId: simRisk.facilityId,
        facilityName: simRisk.facilityName,
        medicineId: simRisk.medicineId,
        medicineName: simRisk.medicineName,
        baselineScore: baseRisk.compositeScore,
        baselineTier: baseRisk.riskTier,
        simulatedScore: simRisk.compositeScore,
        simulatedTier: simRisk.riskTier,
        scoreDelta: simRisk.compositeScore - baseRisk.compositeScore,
        primaryCause: supplierDelayDays > 0 && consumptionMultiplier > 1 
          ? `Compounded supplier lag (+${supplierDelayDays}d) & ${consumptionMultiplier}x demand surge`
          : supplierDelayDays > 0 
            ? `Supplier delivery lag of +${supplierDelayDays} days` 
            : `${consumptionMultiplier}x outbreak consumption surge`
      });
    }
  });

  return {
    scenarioApplied: {
      supplierDelayDays,
      consumptionMultiplier,
      blockedRouteIds: Array.from(blockedRouteIds),
      isolatedFacilityId
    },
    metrics: {
      baselineCriticalCount,
      simulatedCriticalCount,
      netIncreaseInCriticalItems: Math.max(0, simulatedCriticalCount - baselineCriticalCount),
      totalMonitoredItems: inventory.length,
      blockedRoutesCount: blockedRouteIds.size
    },
    simulatedForecasts,
    simulatedRisks,
    updatedRoutes,
    newlyEndangeredItems
  };
}
