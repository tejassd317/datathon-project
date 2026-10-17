# MediReach AI
### Predictive Supply Chain Optimization for Critical Pharmaceuticals in Vulnerable Rural Networks
**IBM Z Datathon 2026** | **Repository:** [https://github.com/tejassd317/datathon-project.git](https://github.com/tejassd317/datathon-project.git)

---

> **Notice:** This project is built using strictly **synthetic demonstration data** with **zero Patient-Identifiable Information (No PII)**. All stockout and demand forecasts utilize transparent, deterministic baseline run-rate algorithms; we do not claim unvalidated machine-learning accuracy.

---

## 1. Executive Summary & Challenge Context

Rural health networks in vulnerable geographical corridors (such as the Rift Valley escarpments and arid outposts) face chronic, life-threatening pharmaceutical stockouts. A single road washout or supplier delay often isolates dispensaries, leading to preventable maternal deaths (oxytocin stockouts), untreated severe malaria (artesunate stockouts), and child malnutrition emergencies (RUTF stockouts).

**MediReach AI** solves this through:
1. **Explainable Baseline Forecasting:** Day-by-day deterministic inventory depletion trajectories (7–30 days) with replenishment lag detection.
2. **Multi-Factor Risk Prioritization:** Transparent weighted composite scoring combining Urgency (35%), Clinical Criticality (30%), Lead Time Gap (20%), and Facility Vulnerability (15%).
3. **Supply Disruption Stress-Test Simulator:** Real-time simulation of supplier delivery delays, road washouts, and disease outbreak consumption spikes.
4. **Zero-Harm Redistribution Optimizer:** Identifies surplus donor facilities without breaching their own safety-stock thresholds, enforces cold-chain vehicle/storage requirements, and checks batch expiry.
5. **Human-in-the-Loop Clinical Authorization:** Strictly requires designated human clinical officers/pharmacists to review and authorize consequential inter-facility stock transfers.
6. **Geospatial Rural Network Topology:** Interactive interactive SVG geographic visualization mapping facilities and connecting roads.
7. **Cross-Platform & IBM LinuxONE Ready:** 100% JavaScript/Node.js stack with zero Python dependencies, fully compatible with IBM LinuxONE (`s390x`) and local edge servers.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Data Layer ["Data & Storage Layer (No PII)"]
        F[facilities.json - 5 Rural Facilities]
        M[medicines.json - 8 Critical Pharmaceuticals]
        I[inventory.json - Stock, Consumption, Batches]
        R[transitRoutes.json - Roads, Cold-Chain Capabilities]
        Store[Universal In-Memory State & Audit Log]
    end

    subgraph Backend ["Node.js + Express Backend Engine (Port 5001)"]
        ForecastSvc["Forecasting Service (Deterministic Run-Rate)"]
        RiskSvc["Risk Prioritization Service (Multi-Factor Scoring)"]
        DisruptSvc["Disruption Simulator (Delays, Closures, Surges)"]
        RedistSvc["Redistribution Optimizer (Zero-Harm & Cold-Chain)"]
        RecommSvc["Actionable Recommendations Engine"]
        ReportSvc["Report Generator (CSV & Markdown)"]
        
        API["REST API Router (/api/...)"]
    end

    subgraph Frontend ["React + Vite Healthcare Dashboard (Port 5173)"]
        DashMetrics["KPI Metrics Strip"]
        NetworkMap["Geospatial Topology SVG Map"]
        InvTable["Filterable Inventory Table"]
        ForecastChart["7-30 Day Recharts Trajectory"]
        RiskMatrix["Multi-Factor Risk Breakdown"]
        DisruptSimUI["Stress-Test Sliders & Presets"]
        RedistUI["Redistribution Pipeline & Human Approval Modal"]
        AuditLog["Immutable Transfer Audit Trail"]
        ReportModal["Downloadable Assessment Report (CSV/MD/Print)"]
    end

    Data Layer --> Backend
    Backend --> Frontend
```

---

## 3. Environment & Prerequisites

### Check if Node.js and npm are Installed
Open Windows PowerShell and check:
```powershell
node -v
npm -v
```

### If Node.js is Missing on Windows
If `node` or `npm` is not recognized, run the official Windows Package Manager (winget) command:
```powershell
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
```
*After installation completes, restart PowerShell to refresh environment PATH.*

---

## 4. Local Installation & Startup (Beginner Step-by-Step)

### Step 1: Clone Repository
```powershell
git clone https://github.com/tejassd317/datathon-project.git
cd datathon-project
```

### Step 2: Install Backend Dependencies & Start Server
```powershell
# In PowerShell (from project root):
cd backend
npm install
npm start
```
*The backend API will start on **http://localhost:5001**.*  
*Health check:* [http://localhost:5001/api/health](http://localhost:5001/api/health)

### Step 3: Install Frontend Dependencies & Start Dashboard
Open a second PowerShell window:
```powershell
# In PowerShell (from project root):
cd frontend
npm install
npm run dev
```
*The React + Vite frontend will start on **http://localhost:5173**.*  
Open your browser and visit **http://localhost:5173** to view the live dashboard.

---

## 5. Automated Testing Suite

The backend contains automated tests with 100% pass rate using the Node.js native test runner (`node --test`). Zero third-party testing dependencies required!

To execute the test suite:
```powershell
cd backend
npm test
```

### Test Coverage Areas:
- **`tests/forecasting.test.js`**:
  - Baseline days until stockout calculations ($Stock / BurnRate$)
  - Safety stock threshold breach detection
  - Replenishment order arrival day integration
  - Outbreak demand surge multiplier effect
  - Division by zero safety for zero consumption
- **`tests/disruption.test.js`**:
  - Supplier lead time delay simulation
  - Impassable road closure status updates
  - Disease outbreak consumption surge risk escalation
- **`tests/redistribution.test.js`**:
  - Zero-Harm Donor rule: Donor must retain buffer above safety threshold
  - Cold-chain strictness: Rejects transfer if route lacks refrigerated vehicle
  - Road passability constraint: Flags blocked routes
  - Expiry date filter: Excludes donor batches expiring within 30 days
- **`tests/api.test.js`**:
  - Full REST API integration tests for health, dashboard summary, inventory queries, disruption simulations, redistribution proposals, and human approval execution.

---

## 6. Mathematical & Algorithmic Transparency

### 1. Demand & Trajectory Forecasting Heuristic
For each day $t \in [1, \text{Horizon}]$:
$$\text{BurnRate} = \text{AverageDailyConsumption} \times \text{SurgeMultiplier}$$
$$\text{Stock}(t) = \max\left(0, \, \text{Stock}(t-1) - \text{BurnRate} + \text{Inflow}(t)\right)$$
Where $\text{Inflow}(t)$ equals $\text{PendingOrderQuantity}$ on day $t = \text{EffectiveLeadTime}$, and $0$ on other days.

### 2. Multi-Factor Risk Prioritization Score
$$\text{RiskScore} = \text{round}\Big(0.35 \cdot S_{\text{urgency}} + 0.30 \cdot S_{\text{criticality}} + 0.20 \cdot S_{\text{leadTimeDeficit}} + 0.15 \cdot S_{\text{facilityVulnerability}}\Big)$$
- **Urgency ($S_{\text{urgency}}$):** 100 if stockout $\le 0\text{d}$; 95 if $\le 2\text{d}$; 80 if $\le 4\text{d}$; 65 if $\le 7\text{d}$.
- **Criticality ($S_{\text{criticality}}$):** Clinical life-saving criticality scale (1 to 10 $\times 10$).
- **Lead Time Deficit ($S_{\text{leadTimeDeficit}}$):** 100 if stockout occurs $> 5\text{d}$ before shipment arrives.
- **Facility Vulnerability ($S_{\text{facilityVulnerability}}$):** Up to 90 for isolated/unpaved road health posts.

### 3. Zero-Harm Redistribution Constraint
$$\text{MaxTransferable} = \max\left(0, \, \text{DonorCurrentStock} - \text{DonorSafetyThreshold} - (\text{DonorDailyBurn} \times 3)\right)$$
*If $\text{MaxTransferable} \le 0$, the facility is strictly barred from donating.*

---

## 7. Deployment Instructions: IBM LinuxONE (s390x)

MediReach AI was deliberately built with **zero Python dependency** to run natively and frictionlessly on **IBM LinuxONE** and **IBM z16** enterprise Linux environments (`s390x` architecture).

### Running Natively on IBM LinuxONE (RHEL / Ubuntu for s390x)
```bash
# 1. Install Node.js LTS on LinuxONE (s390x)
sudo apt update && sudo apt install -y nodejs npm
# Or on RHEL: sudo dnf module install -y nodejs:20

# 2. Verify architecture
uname -m
# Output should show: s390x

# 3. Clone and run backend
git clone https://github.com/tejassd317/datathon-project.git
cd datathon-project/backend
npm ci --only=production
PORT=5001 npm start
```

### Docker Container Deployment (Multi-Arch / s390x)
Create an IBM LinuxONE container image:
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
EXPOSE 5001
CMD ["node", "src/server.js"]
```
Build and run on LinuxONE:
```bash
docker build -t medireach-backend:latest .
docker run -d -p 5001:5001 --name medireach-ai medireach-backend:latest
```

---

## 8. Git Workflow: Committing & Pushing to Existing Repository

To commit and push the working MVP to the repository:

```powershell
# 1. Check status (confirm .gitignore excludes node_modules)
git status

# 2. Add all new project files
git add backend frontend .gitignore README.md

# 3. Commit with a structured message
git commit -m "feat(mvp): implement MediReach AI predictive supply chain optimization platform

- Add Node.js Express backend with explainable baseline forecasting
- Add multi-factor risk prioritization engine and supply disruption simulator
- Add zero-harm redistribution optimizer with route and cold-chain verification
- Add human-in-the-loop clinical authorization workflow
- Add React + Vite frontend with geospatial SVG topology map and Recharts
- Add downloadable assessment report (CSV, Markdown, Print)
- Add 21 automated tests with 100% pass rate
- Preserve existing quantum_safe_scanner directory untouched"

# 4. Push to origin main branch
git branch -M main
git push -u origin main
```

---

## 9. Monitored Facilities in Demo Network
1. **Eldama Ravine District Medical Depot (FAC-004)**: Level 4 Referral Depot, Regional Central Hub, Grid + Diesel generator cold room.
2. **Baringo Ridge Health Centre (FAC-001)**: Level 3 Sub-County Hospital, Escarpment road, Solar Direct Drive refrigeration.
3. **Kipkabus Dispensary (FAC-002)**: Level 2 Rural Dispensary, Highland agricultural corridor, Battery-backed cold chain.
4. **Marigat Riverine Care Post (FAC-003)**: Level 2 Primary Post, Flood-prone river crossing, No built-in cold chain (Cold-Box dependent).
5. **Tiaty Semi-Arid Outpost (FAC-005)**: Level 2 Remote Outpost, Rugged 4x4 track, Solar-hybrid refrigeration.

---

## 10. Team & Acknowledgments
- **Project:** MediReach AI
- **Datathon:** IBM Z Datathon 2026
- **Existing Work Preserved:** `quantum_safe_scanner/` preserved intact in root.
- **License:** Apache 2.0
