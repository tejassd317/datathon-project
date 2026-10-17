/**
 * MediReach AI - Frontend API Service Client
 * Handles requests to backend Express REST API.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  async getDashboardSummary() {
    const res = await fetch(`${BASE_URL}/api/dashboard/summary`);
    return handleResponse(res);
  },

  async getInventory(filters = {}) {
    const query = new URLSearchParams();
    if (filters.facilityId) query.set('facilityId', filters.facilityId);
    if (filters.medicineId) query.set('medicineId', filters.medicineId);
    if (filters.riskTier) query.set('riskTier', filters.riskTier);

    const res = await fetch(`${BASE_URL}/api/inventory?${query.toString()}`);
    return handleResponse(res);
  },

  async getFacilities() {
    const res = await fetch(`${BASE_URL}/api/inventory/facilities`);
    return handleResponse(res);
  },

  async getMedicines() {
    const res = await fetch(`${BASE_URL}/api/inventory/medicines`);
    return handleResponse(res);
  },

  async getForecasts(horizonDays = 30) {
    const res = await fetch(`${BASE_URL}/api/forecast?horizonDays=${horizonDays}`);
    return handleResponse(res);
  },

  async getForecastDetail(inventoryId, horizonDays = 30) {
    const res = await fetch(`${BASE_URL}/api/forecast/${inventoryId}?horizonDays=${horizonDays}`);
    return handleResponse(res);
  },

  async getDisruptionPresets() {
    const res = await fetch(`${BASE_URL}/api/disruption/presets`);
    return handleResponse(res);
  },

  async getCurrentScenario() {
    const res = await fetch(`${BASE_URL}/api/disruption/current`);
    return handleResponse(res);
  },

  async simulateDisruption(scenario) {
    const res = await fetch(`${BASE_URL}/api/disruption/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario)
    });
    return handleResponse(res);
  },

  async getRedistributionRecommendations() {
    const res = await fetch(`${BASE_URL}/api/redistribution/recommendations`);
    return handleResponse(res);
  },

  async getTransfers() {
    const res = await fetch(`${BASE_URL}/api/transfers`);
    return handleResponse(res);
  },

  async approveTransfer(payload) {
    const res = await fetch(`${BASE_URL}/api/transfers/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async resetInventory() {
    const res = await fetch(`${BASE_URL}/api/inventory/reset`, { method: 'POST' });
    return handleResponse(res);
  },

  async getAssessmentReport() {
    const res = await fetch(`${BASE_URL}/api/reports/assessment`);
    return handleResponse(res);
  },

  getDownloadCsvUrl() {
    return `${BASE_URL}/api/reports/download-csv`;
  },

  getDownloadMarkdownUrl() {
    return `${BASE_URL}/api/reports/download-markdown`;
  }
};
