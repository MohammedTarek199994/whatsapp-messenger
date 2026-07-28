import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const { data } = await api.get('/v1/keys');
      setKeys(data);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/v1/keys', { label });
      setNewKey(data.key_value);
      setLabel('');
      setShowNew(false);
      loadKeys();
      toast.success('تم إنشاء المفتاح');
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الإنشاء');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, isActive) => {
    try {
      await api.put(`/v1/keys/${id}`, { is_active: !isActive });
      loadKeys();
    } catch {
      toast.error('فشل التعديل');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف المفتاح؟ لن تتمكن من استخدامه مرة ثانية.')) return;
    try {
      await api.delete(`/v1/keys/${id}`);
      toast.success('تم الحذف');
      loadKeys();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const handleCopy = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-wa-sidebar border-b border-wa-hover px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">API Keys</h2>
          <p className="text-xs text-gray-400 mt-1">مفاتيح لاستخدام الـ API في مشاريعك</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-wa-green text-wa-teal text-sm font-bold rounded-lg hover:bg-wa-dark transition-colors"
        >
          + مفتاح جديد
        </button>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="mx-6 mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <p className="text-sm text-green-400 font-bold mb-2">مفتاحك الجديد - احفظه الآن!</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-wa-chat px-3 py-2 rounded-lg text-wa-green break-all">
              {newKey}
            </code>
            <button
              onClick={() => handleCopy(newKey)}
              className="px-3 py-2 bg-wa-input rounded-lg text-xs text-gray-300 hover:text-white"
            >
              {copied === newKey ? 'تم' : 'نسخ'}
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="px-3 py-2 text-xs text-gray-400 hover:text-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showNew && (
        <div className="mx-6 mt-4 p-4 bg-wa-input rounded-xl">
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              placeholder="اسم المفتاح (مثلاً: مشروع X)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 px-4 py-2 bg-wa-chat rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-wa-green text-wa-teal text-sm font-bold rounded-lg hover:bg-wa-dark transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'إنشاء'}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              إلغاء
            </button>
          </form>
        </div>
      )}

      {/* Keys list */}
      <div className="flex-1 overflow-y-auto p-6">
        {keys.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-4xl mb-4">🔑</div>
            <p>لا توجد مفاتيح بعد</p>
            <p className="text-xs mt-2">أنشئ مفتاح جديد لتبدأ استخدام الـ API</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <div
                key={k.id}
                className={`p-4 rounded-xl border transition-colors ${
                  k.is_active
                    ? 'bg-wa-sidebar border-wa-hover'
                    : 'bg-wa-sidebar border-red-500/20 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{k.label}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          k.is_active ? 'bg-wa-green/20 text-wa-green' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {k.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-wa-chat px-3 py-1.5 rounded-lg text-gray-400 truncate max-w-md">
                        {k.key_value}
                      </code>
                      <button
                        onClick={() => handleCopy(k.key_value)}
                        className="text-xs text-gray-400 hover:text-white px-2"
                      >
                        {copied === k.key_value ? 'تم النسخ ✓' : '📋 نسخ'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {new Date(k.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex gap-2 mr-4">
                    <button
                      onClick={() => handleToggle(k.id, k.is_active)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        k.is_active
                          ? 'text-yellow-400 hover:bg-yellow-500/10'
                          : 'text-wa-green hover:bg-wa-green/10'
                      }`}
                    >
                      {k.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage guide */}
      <div className="mx-6 mb-6 p-4 bg-wa-input rounded-xl">
        <h3 className="text-sm font-bold text-gray-300 mb-3">طريقة الاستخدام</h3>
        <div className="bg-wa-chat rounded-lg p-3 text-xs text-gray-400 font-mono overflow-x-auto">
          <pre>{`fetch('http://127.0.0.1:5000/api/v1/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'wm_...'  // المفتاح حقك
  },
  body: JSON.stringify({
    phone: '966512345678',
    message: 'مرحبا!'
  })
})`}</pre>
        </div>
      </div>
    </div>
  );
}
