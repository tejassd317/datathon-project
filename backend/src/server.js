import { app } from './app.js';

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` MediReach AI Backend Service`);
  console.log(` Project: Predictive Supply Chain Optimization`);
  console.log(` Server active on: http://localhost:${PORT}`);
  console.log(` Health check:    http://localhost:${PORT}/api/health`);
  console.log(` Summary API:     http://localhost:${PORT}/api/dashboard/summary`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing HTTP server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
