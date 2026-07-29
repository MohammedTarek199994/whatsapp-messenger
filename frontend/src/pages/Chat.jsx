import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STATUS_LABELS = {
  pending: { text: '⏳', color: 'text-gray-400' },
  sent: { text: '✓', color: 'text-gray-400' },
  delivered: { text: '✓✓', color: 'text-gray-400' },
  read: { text: '✓✓', color: 'text-blue-400' },
  failed: { text: '✗', color: 'text-red-400' }
};

export default function Chat() {
  const [qr, setQr] = useState(null);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [phone, setPhone] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    const pollStatus = setInterval(async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        setWaStatus(data.status);
        if (data.qr) setQr(data.qr);
        if (data.status === 'connected') setQr(null);
      } catch {}
    }, 3000);

    const pollMessages = setInterval(() => fetchMessages(), 5000);

    fetchInitialData();

    return () => {
      clearInterval(pollStatus);
      clearInterval(pollMessages);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/messages?limit=100');
      setMessages(data.messages);
    } catch {}
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/messages/stats');
      setStats(data);
    } catch {}
  };

  const fetchInitialData = async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setWaStatus(data.status);
      if (data.qr) setQr(data.qr);
    } catch {}
    await fetchMessages();
    await fetchStats();
  };

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phone || !content) return;

    setSending(true);
    try {
      const { data } = await api.post('/messages/send', {
        phone: phone.replace(/[^0-9]/g, ''),
        content
      });
      setMessages((prev) => [data, ...prev]);
      setContent('');
      toast.success('تم إرسال الرسالة');
      try {
        const { data: s } = await api.get('/messages/stats');
        setStats(s);
      } catch {}
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const statusColor = {
    disconnected: 'bg-red-500',
    'qr-pending': 'bg-yellow-500',
    reconnecting: 'bg-yellow-500',
    connected: 'bg-wa-green'
  };

  const statusText = {
    disconnected: 'غير متصل',
    'qr-pending': 'امسح الكود',
    reconnecting: 'إعادة اتصال...',
    connected: 'متصل'
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="bg-wa-sidebar border-b border-wa-hover px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusColor[waStatus]}`} />
            <span className="text-sm text-gray-300">{statusText[waStatus]}</span>
          </div>
          {stats && (
            <div className="flex gap-4 text-xs text-gray-400">
              <span>📧 {stats.total}</span>
              <span className="text-wa-green">✓ {stats.sent}</span>
              <span className="text-blue-400">👁 {stats.read}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-wa-chat">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              لا توجد رسائل بعد
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="max-w-lg mr-auto bg-wa-input rounded-xl px-4 py-2">
                <div className="text-xs text-gray-400 mb-1">
                  📞 {msg.phone}
                  {msg.contacts?.name && <span className="mr-2">• {msg.contacts.name}</span>}
                </div>
                <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className={`text-xs ${STATUS_LABELS[msg.status]?.color || 'text-gray-400'}`}>
                    {STATUS_LABELS[msg.status]?.text || '?'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('ar-SA') : '...'}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEnd} />
        </div>

        <div className="bg-wa-sidebar border-t border-wa-hover p-4">
          {waStatus !== 'connected' ? (
            <div className="text-center text-gray-400 text-sm py-2">
              اربط واتساب أولاً من لوحة QR
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                type="text"
                placeholder="رقم الجوال (9665...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-48 px-4 py-2.5 bg-wa-input rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
                required
              />
              <input
                type="text"
                placeholder="اكتب رسالتك..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-wa-input rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
                required
              />
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-2.5 bg-wa-green text-wa-teal font-bold rounded-lg hover:bg-wa-dark transition-colors disabled:opacity-50 text-sm"
              >
                {sending ? '...' : 'إرسال'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="w-80 bg-wa-sidebar border-r border-wa-hover p-6 flex flex-col items-center">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">ربط واتساب</h2>

        {waStatus === 'connected' ? (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-wa-green font-bold">متصل بالواتساب</p>
            <p className="text-xs text-gray-400 mt-2">يمكنك الآن إرسال الرسائل</p>
          </div>
        ) : qr ? (
          <div className="text-center">
            <img src={qr} alt="QR Code" className="w-56 h-56 rounded-xl border border-wa-hover" />
            <p className="text-xs text-gray-400 mt-4">
              افتح واتساب على جوالك → الأجهزة المرتبطة → ربط جهاز
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-sm">
              {waStatus === 'reconnecting' ? 'جاري إعادة الاتصال...' : 'جاري تحميل الكود...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
