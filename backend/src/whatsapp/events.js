import supabase from '../supabase.js';

const STATUS_MAP = {
  0: 'failed',
  1: 'pending',
  2: 'sent',
  3: 'delivered',
  4: 'read',
  5: 'read'
};

export function setupMessageEvents(sock, userId) {
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

      await supabase
        .from('messages')
        .update(updateData)
        .eq('wa_message_id', waMessageId)
        .eq('user_id', userId);
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

      console.log(`[${userId}] Incoming from ${phone}: ${content}`);
    }
  });
}