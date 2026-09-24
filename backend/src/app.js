import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import catalogRoutes from './routes/catalogRoutes.js';
import { smartReportRouter, mappingRouter } from './routes/smartReportRoutes.js';
import { basicAuth } from './middleware/basicAuth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(basicAuth());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.json({ status: 'ok', db: connected ? 'connected' : 'disconnected' });
});

app.use('/api/catalog', catalogRoutes);
app.use('/api/smart-report', smartReportRouter);
app.use('/api/mappings', mappingRouter);

// Single-service deploy: serve the built frontend (frontend/dist) when it exists
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
