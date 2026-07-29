import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  delay,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupMessageEvents } from './events.js';
import supabase from '../supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '../../auth_info');

let sock = null;
let currentQR = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;
let reconnectTimer = null;

const logger = pino({ level: 'warn' });

function getIO() {
  return global._io;
}

function broadcastStatus(status, extra = {}) {
  getIO()?.emit('connection-status', { status, ...extra });
}

function cleanAuth() {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

async function initWhatsApp() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  console.log('Initializing WhatsApp connection...');
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let agent = undefined;
  if (process.env.PROXY) {
    console.log('Using proxy:', process.env.PROXY);
    agent = process.env.PROXY.startsWith('socks')
      ? new SocksProxyAgent(process.env.PROXY)
      : new HttpsProxyAgent(process.env.PROXY);
  }

  sock = makeWASocket({
    auth: state,
    logger,
    agent,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR code received!');
      try {
        currentQR = await QRCode.toDataURL(qr, { width: 300 });
        connectionStatus = 'qr-pending';
        broadcastStatus('qr-pending');
        getIO()?.emit('qr', { qr: currentQR });
      } catch (err) {
        console.error('QR generation error:', err.message);
      }
    }

    if (lastDisconnect) {
      const error = lastDisconnect.error;
      const statusCode = error ? new Boom(error)?.output?.statusCode : null;
      console.log('Disconnect reason:', statusCode, error?.message || error);
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error ? new Boom(error)?.output?.statusCode : null;
      console.log('Disconnect detail:', error?.message || error);

      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
        console.log('Session invalid, clearing...');
        cleanAuth();
        connectionStatus = 'disconnected';
        currentQR = null;
        connectedPhone = null;
        broadcastStatus('disconnected');
        reconnectTimer = setTimeout(() => initWhatsApp(), 3000);
      } else if (statusCode === DisconnectReason.connectionReplaced) {
        console.log('Session replaced');
        broadcastStatus('disconnected');
        reconnectTimer = setTimeout(() => initWhatsApp(), 2000);
      } else {
        console.log('Reconnecting in 5s...');
        broadcastStatus('reconnecting');
        reconnectTimer = setTimeout(() => initWhatsApp(), 5000);
      }
    }

    if (connection === 'open') {
      connectionStatus = 'connected';
      currentQR = null;
      connectedPhone = sock.user?.id?.replace(/:.*@/, '@').split('@')[0];
      console.log('WhatsApp connected! Phone:', connectedPhone);
      broadcastStatus('connected', { phone: connectedPhone });
      getIO()?.emit('qr', { qr: null });

      try {
        await supabase.from('whatsapp_sessions').upsert({
          user_id: 'default',
          is_connected: true,
          phone_number: connectedPhone,
          last_connected: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('Session save error:', err.message);
      }
    }
  });

  setupMessageEvents(sock);
}

function normalizePhone(phone) {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) clean = clean.substring(2);
  if (clean.startsWith('0') && clean.length >= 10) clean = clean.substring(1);
  return clean;
}

async function sendMessage(phone, content) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  const cleanPhone = normalizePhone(phone);
  const jid = `${cleanPhone}@s.whatsapp.net`;
  const result = await sock.sendMessage(jid, { text: content });

  await delay(1000 + Math.random() * 2000);

  return {
    key: result.key,
    messageId: result.key.id
  };
}

async function logout() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (sock) {
    await sock.logout();
    sock = null;
    connectionStatus = 'disconnected';
    currentQR = null;
    connectedPhone = null;
  }
}

function getStatus() {
  return { status: connectionStatus, qr: currentQR, phone: connectedPhone };
}

export { initWhatsApp, sendMessage, logout, getStatus, getIO };
