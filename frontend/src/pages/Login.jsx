import { useState } from 'react';
import { useAuth } from '../lib/supabase.jsx';
import toast from 'react-hot-toast';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
        toast.success('تم التسجيل بنجاح');
      } else {
        await login(email, password);
        toast.success('تم تسجيل الدخول');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wa-chat p-4">
      <div className="w-full max-w-md bg-wa-sidebar rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-2xl font-bold text-wa-green">WhatsApp Messenger</h1>
          <p className="text-gray-400 mt-2 text-sm">أرسل رسائل واتساب من المتصفح</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="الاسم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-wa-input rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wa-green"
              required
            />
          )}
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-wa-input rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wa-green"
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-wa-input rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wa-green"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-wa-green text-wa-teal font-bold rounded-lg hover:bg-wa-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري...' : isRegister ? 'تسجيل' : 'دخول'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-400">
          {isRegister ? 'عندك حساب؟' : 'ما عندك حساب؟'}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-wa-green hover:underline mr-2"
          >
            {isRegister ? 'تسجيل دخول' : 'سجل الآن'}
          </button>
        </p>
      </div>
    </div>
  );
}
