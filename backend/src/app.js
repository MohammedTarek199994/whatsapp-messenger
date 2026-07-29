import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import apiRoutes from './routes/api.js';
import { getStatus } from './whatsapp/client.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/v1', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  next();
}, apiRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.get('/api/whatsapp/status', (_, res) => res.json(getStatus()));
app.get('/test', (_, res) => res.send('connected'));

export default app;
