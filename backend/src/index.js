import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import contactRoutes from './routes/contacts.js';
import apiRoutes from './routes/api.js';
import { initWhatsApp, getStatus } from './whatsapp/client.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', methods: ['GET', 'POST'] }
});

global._io = io;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('connection-status', getStatus());
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initWhatsApp().catch(err => {
    console.error('WhatsApp init error:', err.message);
  });
});
