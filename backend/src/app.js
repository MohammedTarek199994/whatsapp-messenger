import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import apiRoutes from './routes/api.js';
import supabase from './supabase.js';
import { getStatus, ensureInstance, logout, cleanAuth } from './whatsapp/client.js';

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

async function userAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
}

app.get('/api/whatsapp/status', (req, res) => {
  const userId = req.query.user_id || 'default';
  ensureInstance(userId);
  res.json(getStatus(userId));
});

app.post('/api/whatsapp/disconnect', (req, res) => {
  const userId = req.body.user_id || req.query.user_id || 'default';
  logout(userId);
  cleanAuth(userId);
  ensureInstance(userId);
  res.json({ success: true, message: 'Disconnected. New QR will be generated.' });
});

app.get('/qr', (req, res) => {
  const userId = req.query.user_id || 'default';
  ensureInstance(userId);
  const { status, qr } = getStatus(userId);
  if (qr) {
    res.send(`<html dir="rtl"><head><meta charset="utf-8"><title>QR Code</title></head><body style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#111;color:#fff"><img src="${qr}" style="border-radius:12px;border:2px solid #333" /><p style="margin-top:20px">افتح واتساب → الأجهزة المرتبطة → ربط جهاز</p><p style="font-size:12px;color:#666">الحالة: ${status}</p></body></html>`);
  } else {
    res.json({ status });
  }
});

app.get('/test', (_, res) => res.send('connected'));

export default app;