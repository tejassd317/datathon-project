/**
 * MediReach AI - Forecasting Service
 * Transparent baseline calculations for demand consumption, stockout timelines,
 * and 7-30 day inventory trajectory.
 * 
 * NOTE: This is an explainable, deterministic baseline model.
 * Per Datathon rules, we do not claim unvalidated ML accuracy.
 */

/**
 * Calculates stockout timeline and day-by-day trajectory for a single inventory item.
 * 
 * @param {Object} item - Inventory item
 * @param {Object} options - Simulation/override options
 * @param {number} [options.consumptionMultiplier=1.0] - Surge factor for outbreak simulation
 * @param {number} [options.supplierDelayDays=0] - Additional delivery delay in days
 * @param {number} [options.horizonDays=30] - Prediction window (7 to 30 days)
 * @returns {Object} Forecast metrics and timeline
 */
export function calculateStockoutMetrics(item, options = {}) {
  const multiplier = Number(options.consumptionMultiplier) || 1.0;
  const supplierDelay = Number(options.supplierDelayDays) || 0;
  const horizon = Math.min(60, Math.max(7, Number(options.horizonDays) || 30));

  const dailyBurn = Number((item.averageDailyConsumption * multiplier).toFixed(2));
  const currentStock = Number(item.currentStock);
  const safetyThreshold = Number(item.safetyStockThreshold);
  const pendingQty = Number(item.pendingOrderQuantity || 0);
  const pendingDays = Math.max(0, Number(item.pendingOrderDaysRemaining || item.leadTimeDays) + supplierDelay);

  // 1. Days until current stock reaches zero (ignoring future pending arrivals)
  const daysUntilCurrentStockout = dailyBurn > 0 
    ? Number((currentStock / dailyBurn).toFixed(1)) 
    : 999;

  // 2. Days until stock dips below safety threshold
  const unitsAboveSafety = Math.max(0, currentStock - safetyThreshold);
  const daysUntilSafetyBreach = dailyBurn > 0 
    ? Number((unitsAboveSafety / dailyBurn).toFixed(1)) 
    : 999;

  // 3. Will shipment arrive before stockout?
  // Lead time gap = pendingDays - daysUntilCurrentStockout
  const stockoutDeficitDays = pendingDays > daysUntilCurrentStockout && pendingQty > 0
    ? Number((pendingDays - daysUntilCurrentStockout).toFixed(1))
    : 0;

  // 4. Generate daily forward trajectory over horizon (Day 1 through horizon)
  let simStock = currentStock;
  const timeline = [];
  let firstStockoutDay = null;
  let firstSafetyBreachDay = null;

  for (let day = 1; day <= horizon; day++) {
    // Inflow from pending order arrives on designated arrival day
    let inflowToday = 0;
    if (pendingQty > 0 && day === pendingDays) {
      inflowToday = pendingQty;
    }

    const startOfDayStock = simStock;
    const endOfDayStock = Math.max(0, Number((startOfDayStock - dailyBurn + inflowToday).toFixed(2)));
    simStock = endOfDayStock;

    const isStockout = endOfDayStock <= 0;
    const isSafetyBreach = endOfDayStock < safetyThreshold;

    if (isStockout && firstStockoutDay === null) {
      firstStockoutDay = day;
    }
    if (isSafetyBreach && firstSafetyBreachDay === null) {
      firstSafetyBreachDay = day;
    }

    timeline.push({
      day,
      startStock: startOfDayStock,
      consumption: dailyBurn,
      inflow: inflowToday,
      projectedStock: endOfDayStock,
      safetyThreshold,
      isStockout,
      isSafetyBreach
    });
  }

  // 5. Stockout status classification
  let status = 'ADEQUATE';
  let statusSeverity = 'NORMAL'; // NORMAL, WARNING, DANGER, CRITICAL

  if (currentStock <= 0) {
    status = 'OUT_OF_STOCK';
    statusSeverity = 'CRITICAL';
  } else if (daysUntilCurrentStockout <= pendingDays && pendingQty > 0) {
    status = 'REPLENISHMENT_LAG';
    statusSeverity = 'DANGER';
  } else if (daysUntilCurrentStockout <= 3) {
    status = 'IMMINENT_STOCKOUT';
    statusSeverity = 'CRITICAL';
  } else if (daysUntilSafetyBreach <= 7 || currentStock < safetyThreshold) {
    status = 'SAFETY_BUFFER_BREACH';
    statusSeverity = 'WARNING';
  } else if (daysUntilCurrentStockout <= 14) {
    status = 'MONITOR_CLOSELY';
    statusSeverity = 'WARNING';
  }

  return {
    inventoryId: item.inventoryId,
    facilityId: item.facilityId,
    medicineId: item.medicineId,
    currentStock,
    safetyThreshold,
    effectiveDailyConsumption: dailyBurn,
    consumptionMultiplierApplied: multiplier,
    originalPendingDays: item.pendingOrderDaysRemaining || item.leadTimeDays,
    effectivePendingDays: pendingDays,
    supplierDelayDaysApplied: supplierDelay,
    pendingOrderQuantity: pendingQty,
    daysUntilCurrentStockout,
    daysUntilSafetyBreach,
    stockoutDeficitDays,
    firstStockoutDay,
    firstSafetyBreachDay,
    status,
    statusSeverity,
    horizonDays: horizon,
    timeline,
    forecastingMethod: "Deterministic Run-Rate Trajectory (Baseline Heuristic)",
    calculationTimestamp: new Date().toISOString()
  };
}

/**
 * Generates predictions for an entire inventory dataset.
 */
export function generateInventoryForecasts(inventory, options = {}) {
  return inventory.map(item => calculateStockoutMetrics(item, options));
}
