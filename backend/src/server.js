import { initWhatsApp } from './whatsapp/client.js';

// Start WhatsApp connection if not on Vercel (serverless)
if (!process.env.VERCEL) {
  initWhatsApp().catch(err => {
    console.error('WhatsApp init error:', err.message);
  });
}
