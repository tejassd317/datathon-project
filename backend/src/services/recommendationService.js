/**
 * MediReach AI - Actionable Recommendations Service
 * Translates predictive analytics into explainable clinical and supply chain actions.
 * Format adheres to Datathon requirements:
 * [Affected Facility, Medicine, Reason, Proposed Action, Expected Benefit]
 */

export function generateActionableRecommendations({ risks, forecasts, redistributionRecommendations, facilities, medicines }) {
  const actions = [];
  const recMap = new Map(redistributionRecommendations.map(r => [`${r.recipientFacility.id}_${r.medicine.id}`, r]));

  risks.forEach(risk => {
    const key = `${risk.facilityId}_${risk.medicineId}`;
    const transferRec = recMap.get(key);

    if (risk.riskTier === 'CRITICAL') {
      if (transferRec && transferRec.feasibility.isFeasible) {
        actions.push({
          actionId: `ACT-${risk.facilityId}-${risk.medicineId}-01`,
          priority: 'CRITICAL',
          facility: risk.facilityName,
          facilityId: risk.facilityId,
          medicine: risk.medicineName,
          medicineId: risk.medicineId,
          reason: `Imminent stockout warning. Current inventory provides only ${risk.factors.urgency.detail}. Replenishment arrival deficit is acute: ${risk.factors.leadTimeDeficit.detail}.`,
          proposedAction: `Approve emergency inter-facility transfer of ${transferRec.transferDetails.recommendedQuantity} ${transferRec.medicine.unit} from ${transferRec.donorFacility.name} via ${transferRec.transferDetails.transitConnection?.routeCode || 'approved corridor'}. Transit window: ~${transferRec.transferDetails.estimatedTransitHours}h.`,
          expectedBenefit: `Averts stockout for ${transferRec.transferDetails.coverageDaysAdded} days, safeguarding emergency clinical care for ${risk.medicineName}. Donor facility safely preserves ${transferRec.donorFacility.bufferDaysAfterTransfer} days of buffer.`,
          actionType: 'EMERGENCY_REDISTRIBUTION',
          requiresApproval: true,
          approvalStatus: transferRec.humanApproval.status,
          feasibility: transferRec.feasibility,
          recommendationReference: transferRec.recommendationId
        });
      } else if (transferRec && !transferRec.feasibility.isFeasible) {
        actions.push({
          actionId: `ACT-${risk.facilityId}-${risk.medicineId}-02`,
          priority: 'CRITICAL',
          facility: risk.facilityName,
          facilityId: risk.facilityId,
          medicine: risk.medicineName,
          medicineId: risk.medicineId,
          reason: `Stockout imminent (${risk.factors.urgency.detail}), but direct inter-facility redistribution is constrained: ${transferRec.feasibility.issues.join('; ')}.`,
          proposedAction: `Initiate emergency regional procurement dispatch and activate local alternative clinical protocol. Flag logistics escort for route clearance or dedicated mobile cold-box courier.`,
          expectedBenefit: `Prevents unmonitored treatment cessation; escalates critical logistics barrier to county health coordinator.`,
          actionType: 'LOGISTICS_ESCALATION',
          requiresApproval: true,
          approvalStatus: 'PENDING_APPROVAL',
          feasibility: transferRec.feasibility,
          recommendationReference: transferRec.recommendationId
        });
      } else {
        actions.push({
          actionId: `ACT-${risk.facilityId}-${risk.medicineId}-03`,
          priority: 'CRITICAL',
          facility: risk.facilityName,
          facilityId: risk.facilityId,
          medicine: risk.medicineName,
          medicineId: risk.medicineId,
          reason: `Critical inventory exhaustion projected. No local donor network surplus currently available.`,
          proposedAction: `Issue emergency priority order release at National Central Medical Stores with expedited air/special cargo dispatch.`,
          expectedBenefit: `Shortens replenishment lead time by up to 50%, bridging critical treatment gap.`,
          actionType: 'CENTRAL_EXPEDITE',
          requiresApproval: true,
          approvalStatus: 'PENDING_APPROVAL',
          feasibility: { isFeasible: true, status: 'CENTRAL_DISPATCH_REQUIRED' },
          recommendationReference: null
        });
      }
    } else if (risk.riskTier === 'HIGH') {
      actions.push({
        actionId: `ACT-${risk.facilityId}-${risk.medicineId}-04`,
        priority: 'HIGH',
        facility: risk.facilityName,
        facilityId: risk.facilityId,
        medicine: risk.medicineName,
        medicineId: risk.medicineId,
        reason: `Safety buffer breach anticipated within 7 days (${risk.factors.urgency.detail}).`,
        proposedAction: `Verify transit tracking on pending order of ${risk.factors.leadTimeDeficit.detail}. Pre-alert clinical staff on rational dispensing guidelines.`,
        expectedBenefit: `Prevents clinical panic-buying, minimizes wastage, ensures stock buffer is sustained until scheduled shipment docking.`,
        actionType: 'BUFFER_PRESERVATION',
        requiresApproval: false,
        approvalStatus: 'INFORMATIONAL',
        feasibility: { isFeasible: true, status: 'OPERATIONAL_ROUTINE' },
        recommendationReference: null
      });
    }
  });

  return actions;
}
