import express from 'express';
import cors from 'cors';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { inventoryRouter } from './routes/inventoryRoutes.js';
import { forecastRouter } from './routes/forecastRoutes.js';
import { disruptionRouter } from './routes/disruptionRoutes.js';
import { redistributionRouter } from './routes/redistributionRoutes.js';
import { transferRouter } from './routes/transferRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';

export const app = express();

app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MediReach AI - Supply Chain Engine',
    version: '1.0.0',
    runtime: 'Node.js',
    architectureTarget: 'IBM LinuxONE (s390x) & Cross-Platform',
    timestamp: new Date().toISOString()
  });
});

// Register routers
app.use('/api/dashboard', dashboardRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/forecast', forecastRouter);
app.use('/api/disruption', disruptionRouter);
app.use('/api/redistribution', redistributionRouter);
app.use('/api/transfers', transferRouter);
app.use('/api/reports', reportRouter);

// Safe fallback for 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred'
  });
});
