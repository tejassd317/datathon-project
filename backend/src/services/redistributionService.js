/**
 * MediReach AI - Inventory Redistribution Optimizer
 * 
 * Rules & Constraints:
 * 1. Zero Harm to Donor: Donors must never be driven below their safety-stock threshold.
 * 2. Expiry-Aware: Rejects batches expiring within 30 days to avoid transit spoilage.
 * 3. Cold-Chain & Route Strictness: NEVER assumes feasibility. If route or cold-chain
 *    equipment is absent or unverified, explicitly flags the constraint.
 * 4. Human Approval: Requires clinical/human approval before consequential transfer.
 */

/**
 * Finds candidate transit connection between two facilities.
 */
function findTransitConnection(fromFacId, toFacId, routes) {
  // Direct route
  const direct = routes.find(
    r => (r.fromFacilityId === fromFacId && r.toFacilityId === toFacId) ||
         (r.fromFacilityId === toFacId && r.toFacilityId === fromFacId)
  );

  if (direct) {
    return {
      type: 'DIRECT',
      routeId: direct.routeId,
      routeCode: direct.routeCode,
      distanceKm: direct.distanceKm,
      transitHours: direct.normalTransitHours,
      isPassable: direct.isPassable,
      hasColdChainVehicleSupport: direct.hasColdChainVehicleSupport,
      notes: direct.notes
    };
  }

  // Hub connection via FAC-004 (Depot Hub)
  const leg1 = routes.find(r => 
    (r.fromFacilityId === fromFacId && r.toFacilityId === 'FAC-004') ||
    (r.fromFacilityId === 'FAC-004' && r.toFacilityId === fromFacId)
  );
  const leg2 = routes.find(r => 
    (r.fromFacilityId === 'FAC-004' && r.toFacilityId === toFacId) ||
    (r.fromFacilityId === toFacId && r.toFacilityId === 'FAC-004')
  );

  if (leg1 && leg2) {
    return {
      type: 'VIA_HUB',
      routeId: `${leg1.routeId}+${leg2.routeId}`,
      routeCode: `${leg1.routeCode} -> HUB -> ${leg2.routeCode}`,
      distanceKm: leg1.distanceKm + leg2.distanceKm,
      transitHours: Number((leg1.normalTransitHours + leg2.normalTransitHours + 1.0).toFixed(1)), // +1h hub handling
      isPassable: leg1.isPassable && leg2.isPassable,
      hasColdChainVehicleSupport: leg1.hasColdChainVehicleSupport && leg2.hasColdChainVehicleSupport,
      notes: `Multi-leg transfer via Central Depot. Leg 1: ${leg1.isPassable ? 'Passable' : 'Blocked'}; Leg 2: ${leg2.isPassable ? 'Passable' : 'Blocked'}`
    };
  }

  return null;
}

/**
 * Optimizes inventory redistribution for critical/deficit items.
 * 
 * @param {Object} params
 * @param {Array} params.inventory - All current inventory items
 * @param {Array} params.medicines - Medicine master data
 * @param {Array} params.facilities - Facilities master data
 * @param {Array} params.routes - Transit routes
 * @param {Array} params.forecasts - Forecast metrics from forecastingService
 * @param {Array} params.risks - Risk scores from riskService
 * @returns {Array} List of redistribution recommendations
 */
export function optimizeRedistribution({ inventory, medicines, facilities, routes, forecasts, risks }) {
  const medicineMap = new Map(medicines.map(m => [m.id, m]));
  const facilityMap = new Map(facilities.map(f => [f.id, f]));
  const forecastMap = new Map(forecasts.map(fc => [fc.inventoryId, fc]));

  // 1. Identify recipient candidates: Items with imminent stockout (<= 5 days) or safety buffer breach
  const deficitItems = inventory.filter(item => {
    const fc = forecastMap.get(item.inventoryId);
    if (!fc) return false;
    return fc.daysUntilCurrentStockout <= 5 || item.currentStock < item.safetyStockThreshold;
  });

  const recommendations = [];

  for (const recipientItem of deficitItems) {
    const med = medicineMap.get(recipientItem.medicineId);
    const recipientFac = facilityMap.get(recipientItem.facilityId);
    const recipientFc = forecastMap.get(recipientItem.inventoryId);
    if (!med || !recipientFac || !recipientFc) continue;

    // Calculate needed units to restore safety buffer until pending delivery or 10-day buffer
    const bufferTarget = recipientItem.safetyStockThreshold;
    const neededQuantity = Math.max(
      10,
      Math.ceil(bufferTarget - recipientItem.currentStock + (recipientFc.effectiveDailyConsumption * 3))
    );

    // 2. Search for candidate donor facilities with surplus of this exact medicine
    const donorCandidates = inventory.filter(item => {
      if (item.medicineId !== recipientItem.medicineId) return false;
      if (item.facilityId === recipientItem.facilityId) return false;

      // Rule: Donor must have current stock strictly greater than safety stock
      const surplus = item.currentStock - item.safetyStockThreshold;
      return surplus > 5;
    });

    for (const donorItem of donorCandidates) {
      const donorFac = facilityMap.get(donorItem.facilityId);
      const donorFc = forecastMap.get(donorItem.inventoryId);
      if (!donorFac || !donorFc) continue;

      // Safe surplus calculation (Zero-Harm constraint):
      // Surplus = Current Stock - Safety Threshold - (Daily Burn * 3 days buffer)
      const protectedSurplus = Math.max(0, Math.floor(
        donorItem.currentStock - donorItem.safetyStockThreshold - (donorFc.effectiveDailyConsumption * 3)
      ));

      if (protectedSurplus <= 0) {
        continue; // Cannot donate without violating safety buffer
      }

      const recommendedTransferQty = Math.min(neededQuantity, protectedSurplus);
      if (recommendedTransferQty <= 0) continue;

      // 3. Expiry verification on donor batches
      let validBatches = (donorItem.batches || []).filter(batch => {
        if (!batch.expiryDate) return false;
        const expiry = new Date(batch.expiryDate);
        const today = new Date();
        const daysToExpiry = (expiry - today) / (1000 * 60 * 60 * 24);
        return daysToExpiry > 30; // Reject if expiring within 30 days
      });

      const hasValidBatch = validBatches.length > 0;
      const selectedBatch = hasValidBatch ? validBatches[0] : null;

      // 4. Route and Cold Chain Verification
      const transit = findTransitConnection(donorFac.id, recipientFac.id, routes);

      let feasibilityStatus = 'FEASIBLE';
      const feasibilityIssues = [];

      if (!transit) {
        feasibilityStatus = 'ROUTE_UNAVAILABLE';
        feasibilityIssues.push('No charted transit corridor between facilities');
      } else {
        if (!transit.isPassable) {
          feasibilityStatus = 'ROUTE_BLOCKED';
          feasibilityIssues.push(`Transit road impassable (${transit.routeCode})`);
        }

        if (med.requiresColdChain) {
          // Check route vehicle cold-chain capability
          if (!transit.hasColdChainVehicleSupport) {
            feasibilityStatus = 'COLD_CHAIN_UNSUPPORTED';
            feasibilityIssues.push(`Transit route lacks active cold-chain vehicle transport (${med.name} requires ${med.temperatureRange})`);
          }
          // Check recipient facility storage capability
          if (!recipientFac.hasColdChain) {
            feasibilityStatus = 'COLD_CHAIN_UNSUPPORTED';
            feasibilityIssues.push(`Recipient facility ${recipientFac.name} lacks functional cold-chain storage equipment`);
          }
        }
      }

      if (!hasValidBatch) {
        feasibilityStatus = 'EXPIRY_UNSUITABLE';
        feasibilityIssues.push('All donor stock batches expire within 30 days or lack date validation');
      }

      // 5. Expected Benefit & Clinical Impact
      const daysOfCoverageAdded = Number((recommendedTransferQty / recipientFc.effectiveDailyConsumption).toFixed(1));
      const donorRemainingStock = donorItem.currentStock - recommendedTransferQty;
      const donorRemainingBufferDays = Number((donorRemainingStock / donorFc.effectiveDailyConsumption).toFixed(1));

      recommendations.push({
        recommendationId: `REC-${recipientFac.id}-${donorFac.id}-${med.id}`,
        recipientFacility: {
          id: recipientFac.id,
          name: recipientFac.name,
          currentStock: recipientItem.currentStock,
          safetyThreshold: recipientItem.safetyStockThreshold,
          dailyConsumption: recipientFc.effectiveDailyConsumption,
          daysUntilStockout: recipientFc.daysUntilCurrentStockout
        },
        donorFacility: {
          id: donorFac.id,
          name: donorFac.name,
          currentStock: donorItem.currentStock,
          safetyThreshold: donorItem.safetyStockThreshold,
          stockAfterTransfer: donorRemainingStock,
          bufferDaysAfterTransfer: donorRemainingBufferDays,
          allocatedBatch: selectedBatch ? selectedBatch.batchNo : 'N/A',
          batchExpiryDate: selectedBatch ? selectedBatch.expiryDate : 'N/A'
        },
        medicine: {
          id: med.id,
          name: med.name,
          unit: med.unit,
          requiresColdChain: med.requiresColdChain,
          temperatureRange: med.temperatureRange,
          clinicalIndication: med.clinicalIndication,
          criticality: med.criticality
        },
        transferDetails: {
          recommendedQuantity: recommendedTransferQty,
          coverageDaysAdded: daysOfCoverageAdded,
          transitConnection: transit,
          estimatedTransitHours: transit ? transit.transitHours : null,
          estimatedDistanceKm: transit ? transit.distanceKm : null
        },
        feasibility: {
          status: feasibilityStatus,
          isFeasible: feasibilityStatus === 'FEASIBLE',
          issues: feasibilityIssues,
          routeVerified: Boolean(transit && transit.isPassable),
          coldChainVerified: Boolean(
            !med.requiresColdChain || 
            (transit?.hasColdChainVehicleSupport && recipientFac.hasColdChain)
          )
        },
        humanApproval: {
          required: true,
          status: 'PENDING_APPROVAL', // PENDING_APPROVAL, APPROVED, REJECTED
          approvalRoleRequired: 'Clinical Supply Officer / Pharmacist',
          approvedAt: null,
          approvedBy: null,
          notes: ''
        },
        explainableReason: `${recipientFac.name} will experience a complete stockout of ${med.name} in ${recipientFc.daysUntilCurrentStockout} days. Supplier replenishment lag is ${recipientFc.effectivePendingDays} days. Transferring ${recommendedTransferQty} ${med.unit} restores safe operations for ${daysOfCoverageAdded} days without endangering ${donorFac.name} (which maintains ${donorRemainingBufferDays} days of buffer above safety threshold).`
      });
    }
  }

  // Sort recommendations: Feasible first, then highest medicine criticality, then shortest transit time
  return recommendations.sort((a, b) => {
    if (a.feasibility.isFeasible !== b.feasibility.isFeasible) {
      return a.feasibility.isFeasible ? -1 : 1;
    }
    if (b.medicine.criticality !== a.medicine.criticality) {
      return b.medicine.criticality - a.medicine.criticality;
    }
    return (a.transferDetails.estimatedTransitHours || 99) - (b.transferDetails.estimatedTransitHours || 99);
  });
}
