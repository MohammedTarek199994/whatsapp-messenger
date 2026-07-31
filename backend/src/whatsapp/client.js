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
const BASE_AUTH_DIR = path.join(__dirname, '../../auth_info');
const logger = pino({ level: 'warn' });

const instances = new Map();

function getAuthDir(userId) {
  return path.join(BASE_AUTH_DIR, userId);
}

function cleanAuth(userId) {
  const dir = getAuthDir(userId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function initWhatsApp(userId) {
  const existing = instances.get(userId);
  if (existing?.reconnectTimer) {
    clearTimeout(existing.reconnectTimer);
  }

  const authDir = getAuthDir(userId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log(`[${userId}] Initializing WhatsApp connection...`);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let agent = undefined;
  if (process.env.PROXY) {
    agent = process.env.PROXY.startsWith('socks')
      ? new SocksProxyAgent(process.env.PROXY)
      : new HttpsProxyAgent(process.env.PROXY);
  }

  const sock = makeWASocket({
    auth: state,
    logger,
    agent,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false
  });

  const stateObj = { sock, saveCreds, authDir, currentQR: null, connectionStatus: 'disconnected', connectedPhone: null, reconnectTimer: null };
  instances.set(userId, stateObj);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const inst = instances.get(userId);
    if (!inst) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[${userId}] QR code received!`);
      try {
        inst.currentQR = await QRCode.toDataURL(qr, { width: 300 });
        inst.connectionStatus = 'qr-pending';
      } catch (err) {
        console.error(`[${userId}] QR generation error:`, err.message);
      }
    }

    if (lastDisconnect) {
      const error = lastDisconnect.error;
      const statusCode = error ? new Boom(error)?.output?.statusCode : null;
      console.log(`[${userId}] Disconnect reason:`, statusCode, error?.message || error);
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error ? new Boom(error)?.output?.statusCode : null;
      console.log(`[${userId}] Disconnect detail:`, error?.message || error);

      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
        console.log(`[${userId}] Session invalid, clearing...`);
        cleanAuth(userId);
        inst.connectionStatus = 'disconnected';
        inst.currentQR = null;
        inst.connectedPhone = null;
        inst.reconnectTimer = setTimeout(() => initWhatsApp(userId), 3000);
      } else if (statusCode === DisconnectReason.connectionReplaced) {
        console.log(`[${userId}] Session replaced`);
        inst.connectionStatus = 'disconnected';
        inst.reconnectTimer = setTimeout(() => initWhatsApp(userId), 2000);
      } else {
        console.log(`[${userId}] Reconnecting in 5s...`);
        inst.connectionStatus = 'reconnecting';
        inst.reconnectTimer = setTimeout(() => initWhatsApp(userId), 5000);
      }
    }

    if (connection === 'open') {
      inst.connectedPhone = sock.user?.id?.replace(/:.*@/, '@').split('@')[0];

      const otherOwner = await getPhoneOwner(userId, inst.connectedPhone);
      if (otherOwner) {
        console.warn(`[${userId}] Phone ${inst.connectedPhone} is already linked to user ${otherOwner}. Logging out this session to avoid disconnecting the other user. Scan QR with a DIFFERENT number.`);
        inst.connectionStatus = 'duplicate-phone';
        inst.currentQR = null;
        inst.connectedPhone = null;
        if (inst.sock) await inst.sock.logout().catch(() => {});
        cleanAuth(userId);
        return;
      }

      inst.connectionStatus = 'connected';
      inst.currentQR = null;
      console.log(`[${userId}] WhatsApp connected! Phone:`, inst.connectedPhone);

      try {
        await supabase.from('whatsapp_sessions').upsert({
          user_id: userId,
          is_connected: true,
          phone_number: inst.connectedPhone,
          last_connected: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error(`[${userId}] Session save error:`, err.message);
      }
    }
  });

  setupMessageEvents(sock, userId);
}

function normalizePhone(phone) {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('00')) clean = clean.substring(2);
  if (clean.startsWith('0') && clean.length >= 10) clean = clean.substring(1);
  return clean;
}

async function sendMessage(userId, phone, content) {
  const inst = instances.get(userId);
  if (!inst || inst.connectionStatus !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  const cleanPhone = normalizePhone(phone);
  const jid = `${cleanPhone}@s.whatsapp.net`;
  const result = await inst.sock.sendMessage(jid, { text: content });

  await delay(1000 + Math.random() * 2000);

  return {
    key: result.key,
    messageId: result.key.id
  };
}

async function logout(userId) {
  const inst = instances.get(userId);
  if (inst) {
    if (inst.reconnectTimer) clearTimeout(inst.reconnectTimer);
    if (inst.sock) {
      await inst.sock.logout();
    }
    instances.delete(userId);
  }
}

function getStatus(userId) {
  const inst = instances.get(userId);
  if (!inst) return { status: 'disconnected', qr: null, phone: null };
  return { status: inst.connectionStatus, qr: inst.currentQR, phone: inst.connectedPhone };
}

function ensureInstance(userId) {
  if (!instances.has(userId)) {
    initWhatsApp(userId).catch(err => {
      console.error(`[${userId}] WhatsApp init error:`, err.message);
    });
  }
}

function getPhoneOwner(userId, phone) {
  for (const [otherId, inst] of instances) {
    if (otherId !== userId && inst.connectedPhone === phone && inst.connectionStatus === 'connected') {
      return otherId;
    }
  }
  return null;
}

export { initWhatsApp, sendMessage, logout, getStatus, ensureInstance, cleanAuth };