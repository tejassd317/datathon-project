/**
 * MediReach AI - Risk Prioritization Service
 * Multi-factor explainable risk scoring combining:
 * 1. Time to stockout (Urgency)
 * 2. Pharmaceutical clinical criticality
 * 3. Delivery lead time lag (Vulnerability to replenishment delay)
 * 4. Facility accessibility & population dependency
 */

/**
 * Calculates a composite risk score for a single medicine/facility pair.
 * 
 * @param {Object} forecast - Forecast output from forecastingService
 * @param {Object} medicine - Medicine master data
 * @param {Object} facility - Facility master data
 * @returns {Object} Composite score and factor breakdown
 */
export function calculateRiskPriority(forecast, medicine, facility) {
  // 1. Urgency Factor (0 - 100) based on days until stockout
  let urgencyScore = 10;
  const days = forecast.daysUntilCurrentStockout;
  if (days <= 0 || forecast.currentStock <= 0) {
    urgencyScore = 100;
  } else if (days <= 2) {
    urgencyScore = 95;
  } else if (days <= 4) {
    urgencyScore = 80;
  } else if (days <= 7) {
    urgencyScore = 65;
  } else if (days <= 14) {
    urgencyScore = 45;
  } else if (days <= 21) {
    urgencyScore = 25;
  }

  // 2. Criticality Factor (0 - 100) based on clinical life-saving criticality
  const medCrit = medicine ? Number(medicine.criticality) : 5;
  const criticalityScore = Math.min(100, Math.max(10, medCrit * 10));

  // 3. Lead Time Deficit Factor (0 - 100)
  // Evaluates whether replenishment order arrives BEFORE stock runs out
  let leadTimeScore = 20;
  const deficit = forecast.stockoutDeficitDays;
  if (deficit > 5) {
    leadTimeScore = 100; // Stockout occurs 5+ days before shipment arrives!
  } else if (deficit > 0) {
    leadTimeScore = 80;  // Stockout occurs before shipment arrives
  } else if (forecast.daysUntilCurrentStockout - forecast.effectivePendingDays < 2) {
    leadTimeScore = 55;  // Razor thin margin (< 2 days buffer)
  } else {
    leadTimeScore = 25;  // Order scheduled to arrive comfortably before stockout
  }

  // 4. Facility Vulnerability Factor (0 - 100)
  let facilityScore = 40;
  if (facility) {
    const facType = String(facility.type || '');
    const rating = String(facility.location?.accessibilityRating || '');
    if (facType.includes('Mobile Post') || rating.includes('Isolated')) {
      facilityScore = 90;
    } else if (rating.includes('Vulnerable') || rating.includes('Seasonal')) {
      facilityScore = 75;
    } else if (facType.includes('Dispensary') || facType.includes('Primary Health')) {
      facilityScore = 60;
    } else if (facType.includes('Depot') || facType.includes('Referral')) {
      facilityScore = 25; // High resilience depot
    }
  }

  // Weighted Composite Risk Score (0-100)
  // Weights: Urgency (35%), Criticality (30%), Lead Time Gap (20%), Facility Vulnerability (15%)
  const compositeScore = Math.round(
    (urgencyScore * 0.35) +
    (criticalityScore * 0.30) +
    (leadTimeScore * 0.20) +
    (facilityScore * 0.15)
  );

  let riskTier = 'LOW';
  let badgeColor = 'green';
  let priorityRank = 4;

  if (compositeScore >= 75) {
    riskTier = 'CRITICAL';
    badgeColor = 'red';
    priorityRank = 1;
  } else if (compositeScore >= 55) {
    riskTier = 'HIGH';
    badgeColor = 'amber';
    priorityRank = 2;
  } else if (compositeScore >= 35) {
    riskTier = 'MEDIUM';
    badgeColor = 'yellow';
    priorityRank = 3;
  }

  return {
    inventoryId: forecast.inventoryId,
    facilityId: forecast.facilityId,
    facilityName: facility ? facility.name : 'Unknown Facility',
    medicineId: forecast.medicineId,
    medicineName: medicine ? medicine.name : 'Unknown Medicine',
    requiresColdChain: medicine ? medicine.requiresColdChain : false,
    compositeScore,
    riskTier,
    badgeColor,
    priorityRank,
    factors: {
      urgency: {
        score: urgencyScore,
        weight: 0.35,
        weightedContribution: Number((urgencyScore * 0.35).toFixed(1)),
        detail: `${days} days of remaining stock at ${forecast.effectiveDailyConsumption} units/day`
      },
      criticality: {
        score: criticalityScore,
        weight: 0.30,
        weightedContribution: Number((criticalityScore * 0.30).toFixed(1)),
        detail: `Clinical criticality level ${medCrit}/10 (${medicine?.category || 'General'})`
      },
      leadTimeDeficit: {
        score: leadTimeScore,
        weight: 0.20,
        weightedContribution: Number((leadTimeScore * 0.20).toFixed(1)),
        detail: deficit > 0 ? `Shipment arrives ${deficit} days AFTER projected stockout` : `Shipment arrives in ${forecast.effectivePendingDays} days`
      },
      facilityVulnerability: {
        score: facilityScore,
        weight: 0.15,
        weightedContribution: Number((facilityScore * 0.15).toFixed(1)),
        detail: `${facility?.type || 'Standard'} (${facility?.location?.accessibilityRating || 'Road linked'})`
      }
    }
  };
}

/**
 * Prioritizes an entire list of inventory forecasts with medicine and facility lookups.
 */
export function prioritizeInventoryRisks(forecasts, medicinesList, facilitiesList) {
  const medicineMap = new Map(medicinesList.map(m => [m.id, m]));
  const facilityMap = new Map(facilitiesList.map(f => [f.id, f]));

  const scored = forecasts.map(fc => {
    const med = medicineMap.get(fc.medicineId);
    const fac = facilityMap.get(fc.facilityId);
    return calculateRiskPriority(fc, med, fac);
  });

  // Sort descending by compositeScore, then by priorityRank
  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}
