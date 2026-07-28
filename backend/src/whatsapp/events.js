import supabase from '../supabase.js';
import { getIO } from './client.js';

const STATUS_MAP = {
  0: 'failed',
  1: 'pending',
  2: 'sent',
  3: 'delivered',
  4: 'read',
  5: 'read'
};

export function setupMessageEvents(sock) {
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (!update.status) continue;

      const status = STATUS_MAP[update.status] || 'failed';
      const waMessageId = key.id;

      const now = new Date().toISOString();
      const updateData = { status };

      if (status === 'sent') updateData.sent_at = now;
      if (status === 'delivered') updateData.delivered_at = now;
      if (status === 'read') updateData.read_at = now;

      const { data: message } = await supabase
        .from('messages')
        .update(updateData)
        .eq('wa_message_id', waMessageId)
        .select('id, user_id')
        .single();

      if (message) {
        getIO()?.emit('message-status', {
          messageId: message.id,
          waMessageId,
          status
        });
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.fromMe) continue;

      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const content = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || '[media]';

      console.log(`Incoming message from ${phone}: ${content}`);
    }
  });
}
