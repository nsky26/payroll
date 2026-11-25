import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import superAdminRoutes from './routes/superAdmin.js';
import firmRoutes from './routes/firm.js';
import payrollRoutes from './routes/payroll.js';
import operationsRoutes from './routes/operations.js';
import aiRoutes from './routes/ai.js';
import helpRoutes from './routes/help.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PayPulse AI Backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/firm', firmRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/settings', settingsRoutes);

initDatabase()
  .then((res) => {
    console.log('[DB]', res.message);
    app.listen(PORT, () => {
      console.log(`[PayPulse AI] Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Failed to initialize MySQL:', err.message);
    process.exit(1);
  });
