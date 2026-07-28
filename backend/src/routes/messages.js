import { Router } from 'express';
import supabase from '../supabase.js';
import { sendMessage, getStatus } from '../whatsapp/client.js';

const router = Router();

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
}

router.use(authenticate);

router.post('/send', async (req, res) => {
  try {
    const { phone, content, contactId } = req.body;
    if (!phone || !content) {
      return res.status(400).json({ error: 'Phone and content are required' });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) cleanPhone = cleanPhone.substring(1);

    let msgId = null;
    try {
      const { data: msg, error: insertError } = await supabase
        .from('messages')
        .insert({
          user_id: req.user.id,
          contact_id: contactId || null,
          phone: cleanPhone,
          content,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('DB insert error:', insertError);
        throw insertError;
      }
      msgId = msg.id;
    } catch (dbErr) {
      console.error('Database error:', dbErr.message);
    }

    try {
      console.log(`Sending message to ${cleanPhone}...`);
      const result = await sendMessage(cleanPhone, content);
      console.log('Message sent! ID:', result.messageId);

      if (msgId) {
        await supabase
          .from('messages')
          .update({
            status: 'sent',
            wa_message_id: result.messageId,
            sent_at: new Date().toISOString()
          })
          .eq('id', msgId);
      }

      res.json({ id: msgId, phone: cleanPhone, content, status: 'sent', wa_message_id: result.messageId });
    } catch (sendErr) {
      console.error('Send error:', sendErr.message);

      if (msgId) {
        await supabase
          .from('messages')
          .update({ status: 'failed' })
          .eq('id', msgId);
      }

      res.status(500).json({ error: sendErr.message });
    }
  } catch (err) {
    console.error('Route error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ messages: data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('List messages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('status')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const stats = { total: data.length, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
    data.forEach(m => { stats[m.status] = (stats[m.status] || 0) + 1; });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/whatsapp-status', (_, res) => {
  res.json(getStatus());
});

export default router;
