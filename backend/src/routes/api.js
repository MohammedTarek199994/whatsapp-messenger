import { Router } from 'express';
import crypto from 'crypto';
import supabase from '../supabase.js';
import { sendMessage, getStatus } from '../whatsapp/client.js';

const router = Router();

async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: 'Missing X-API-Key header' });

  const { data } = await supabase
    .from('api_keys')
    .select('id, user_id, is_active')
    .eq('key_value', key)
    .eq('is_active', true)
    .single();

  if (!data) return res.status(401).json({ error: 'Invalid API key' });

  req.apiKeyId = data.id;
  req.userId = data.user_id;
  next();
}

async function userAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
}

// Public API - send message (needs X-API-Key)
router.post('/send', apiKeyAuth, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
    if (cleanPhone.startsWith('0') && cleanPhone.length >= 10) cleanPhone = cleanPhone.substring(1);

    const result = await sendMessage(cleanPhone, message);

    res.json({
      success: true,
      phone: cleanPhone,
      messageId: result.messageId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public API - check status (needs X-API-Key)
router.get('/status', apiKeyAuth, (_, res) => {
  res.json(getStatus());
});

// Dashboard - list API keys (needs Supabase token)
router.get('/keys', userAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_value, is_active, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard - create API key
router.post('/keys', userAuth, async (req, res) => {
  try {
    const { label } = req.body;
    if (!label) return res.status(400).json({ error: 'Label is required' });

    const keyValue = 'wm_' + crypto.randomBytes(24).toString('hex');

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: req.user.id,
        label,
        key_value: keyValue
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard - toggle API key
router.put('/keys/:id', userAuth, async (req, res) => {
  try {
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard - delete API key
router.delete('/keys/:id', userAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
