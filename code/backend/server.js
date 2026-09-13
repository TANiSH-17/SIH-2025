// backend/server.js  — APP ENTRY (do NOT put route handlers here)
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- Import ALL Route Files ---
const apiRoutes = require('./routes/api');              
const authRoutes = require('./routes/auth');
const translatorRoutes = require('./routes/translator');
const prescriptionRoutes = require('./routes/prescription');
const otpRoutes = require('./routes/otp');
const predictionRoutes = require('./routes/predictions');
const patientRoutes = require('./routes/patient');
const mdrRoutes = require('./routes/mdr'); 
const { runPredictionModel } = require('./services/predictionService');

const app = express();

// CORS
const corsOptions = {
  origin: [
    'https://sih-2025-pi-seven.vercel.app',
    'https://sih-2025-aayulink.vercel.app', 
    'https://sih-2025-bpa576elr-tanish-17s-projects.vercel.app',
    'https://sih-2025-aegr978t0-tanish-17s-projects.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['authorization', 'content-type'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads');
console.log('Serving uploads from:', uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/translate', translatorRoutes);
app.use('/api/prescription', prescriptionRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/mdr', mdrRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/', (_req, res) => {
  res.status(200).send('AayuLink Backend is running!');
});

const dbConnect = require('./lib/dbConnect');

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
  try {
    await dbConnect();
    console.log('[Database] Connected successfully at startup.');
    // Start the recurring public health prediction model
    runPredictionModel();
    setInterval(runPredictionModel, 3600000); // Runs every hour
  } catch (e) {
    console.error('Prediction service failed to start:', e);
  }
});

// Debugging probe
app.get('/__uploads_probe/:name', (req, res) => {
  const fs = require('fs');
  const p = path.join(__dirname, 'uploads', req.params.name);
  res.json({ path: p, exists: fs.existsSync(p) });
});

module.exports = app;