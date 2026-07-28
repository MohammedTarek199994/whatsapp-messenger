import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/supabase.jsx';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/', label: 'الرسائل', icon: '💬' },
    { to: '/contacts', label: 'جهات الاتصال', icon: '👤' },
    { to: '/api-keys', label: 'API Keys', icon: '🔑' }
  ];

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-wa-sidebar border-l border-wa-hover flex flex-col">
        <div className="p-4 border-b border-wa-hover">
          <h1 className="text-lg font-bold text-wa-green">WhatsApp Messenger</h1>
        </div>

        <nav className="flex-1 p-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-wa-hover text-wa-green'
                    : 'text-gray-400 hover:bg-wa-hover hover:text-white'
                }`
              }
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="m-4 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          خروج
        </button>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
