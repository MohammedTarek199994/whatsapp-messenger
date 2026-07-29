import 'dotenv/config';
import app from './app.js';
import { initWhatsApp } from './whatsapp/client.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start WhatsApp connection if not on Vercel (serverless)
if (!process.env.VERCEL) {
  initWhatsApp().catch(err => {
    console.error('WhatsApp init error:', err.message);
  });
}
