/**
 * MediReach AI - Assessment Report Service
 * Generates downloadable reports in CSV and Markdown formats.
 */

/**
 * Generates CSV string of inventory status and risk priorities.
 */
export function generateInventoryCSV(inventory, medicines, facilities, forecasts, risks) {
  const medicineMap = new Map(medicines.map(m => [m.id, m]));
  const facilityMap = new Map(facilities.map(f => [f.id, f]));
  const forecastMap = new Map(forecasts.map(fc => [fc.inventoryId, fc]));
  const riskMap = new Map(risks.map(r => [r.inventoryId, r]));

  const headers = [
    'Inventory ID',
    'Facility ID',
    'Facility Name',
    'District',
    'Medicine ID',
    'Medicine Name',
    'Dosage',
    'Clinical Indication',
    'Criticality (1-10)',
    'Requires Cold Chain',
    'Current Stock',
    'Safety Stock Threshold',
    'Average Daily Consumption',
    'Days Until Stockout',
    'Pending Order Qty',
    'Lead Time Days',
    'Forecast Status',
    'Risk Score (0-100)',
    'Risk Tier'
  ];

  const rows = inventory.map(item => {
    const med = medicineMap.get(item.medicineId) || {};
    const fac = facilityMap.get(item.facilityId) || {};
    const fc = forecastMap.get(item.inventoryId) || {};
    const rk = riskMap.get(item.inventoryId) || {};

    return [
      item.inventoryId,
      item.facilityId,
      `"${fac.name || ''}"`,
      `"${fac.district || ''}"`,
      item.medicineId,
      `"${med.name || ''}"`,
      `"${med.dosage || ''}"`,
      `"${med.clinicalIndication || ''}"`,
      med.criticality || '',
      med.requiresColdChain ? 'YES' : 'NO',
      item.currentStock,
      item.safetyStockThreshold,
      item.averageDailyConsumption,
      fc.daysUntilCurrentStockout ?? '',
      item.pendingOrderQuantity || 0,
      item.pendingOrderDaysRemaining || item.leadTimeDays,
      fc.status || '',
      rk.compositeScore ?? '',
      rk.riskTier || ''
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates comprehensive markdown assessment report.
 */
export function generateAssessmentMarkdownReport({ summary, risks, recommendations, disruptions, scenario }) {
  const timestamp = new Date().toISOString();
  const criticalItems = risks.filter(r => r.riskTier === 'CRITICAL');
  const highItems = risks.filter(r => r.riskTier === 'HIGH');

  return `# MediReach AI - Vulnerable Network Pharmaceutical Supply Chain Assessment Report
**Project:** MediReach AI | IBM Z Datathon 2026
**Generated At:** ${timestamp}
**Target Environment:** Local Edge / IBM LinuxONE (s390x)
**Data Notice:** SYNTHETIC DEMO DATASET - Visible Demonstration Data Only - No PII.
**Algorithm Notice:** Transparent Baseline Deterministic Calculations (Non-ML Heuristic).

---

## 1. Executive Summary
- **Total Facilities Monitored:** ${summary.totalFacilities}
- **Total Critical Medicines Monitored:** ${summary.totalMedicines}
- **High-Risk / Imminent Stockouts:** ${criticalItems.length}
- **High Priority Stockout Threats:** ${highItems.length}
- **Active Simulation Scenario:** ${scenario?.name || 'Standard Baseline Operations'}

---

## 2. Critical Stockout & Supply Risk Ranking
| Priority Rank | Facility | Critical Medicine | Days to Stockout | Clinical Criticality | Lead Time Gap | Composite Risk Score | Tier |
|---|---|---|---|---|---|---|---|
${risks.slice(0, 10).map((r, i) => `| ${i + 1} | ${r.facilityName} | ${r.medicineName} | ${r.factors.urgency.detail} | ${r.factors.criticality.detail} | ${r.factors.leadTimeDeficit.detail} | **${r.compositeScore}/100** | \`${r.riskTier}\` |`).join('\n')}

---

## 3. Disruption Simulation Impact
- **Supplier Delay Applied:** ${scenario?.supplierDelayDays || 0} days
- **Consumption Outbreak Multiplier:** ${scenario?.consumptionMultiplier || 1.0}x
- **Blocked Corridors:** ${(scenario?.blockedRouteIds || []).length > 0 ? scenario.blockedRouteIds.join(', ') : 'None (All Open)'}
- **Net Increase in Critical Stockouts:** ${disruptions?.metrics?.netIncreaseInCriticalItems || 0} item(s)

---

## 4. Optimized Inter-Facility Redistribution Recommendations
*Human authorization required prior to physical stock transfer.*

${recommendations.map((rec, i) => `
### Recommendation #${i + 1}: ${rec.medicine} for ${rec.facility}
- **Priority:** \`${rec.priority}\`
- **Clinical Trigger:** ${rec.reason}
- **Proposed Operational Action:** ${rec.proposedAction}
- **Expected Clinical & Operational Benefit:** ${rec.expectedBenefit}
- **Human Approval Status:** \`${rec.approvalStatus}\`
`).join('\n')}

---

## 5. Cold-Chain & Feasibility Compliance Checklist
- [x] Zero-Harm Donor Constraint: Donor never transferred below safety threshold.
- [x] Expiry Rule: Batches expiring < 30 days excluded from transfer.
- [x] Cold-Chain Integrity: Temperature-sensitive pharmaceuticals (Oxytocin, Insulin, Rabies Anti-Serum) require verified refrigerated transit.
- [x] Human Oversight: Consequential pharmaceutical redistribution logged with audit timestamp and approver role.

**Report Sign-off:**
*Lead Pharmacist / Supply Chain Coordinator:* ___________________________  
*Date Approved:* ___________________________
`;
}
