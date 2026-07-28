import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/supabase.jsx';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Contacts from './pages/Contacts';
import ApiKeys from './pages/ApiKeys';
import Layout from './components/Layout';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">جاري التحميل...</div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ style: { background: '#202C33', color: '#E9EDEF', direction: 'rtl' } }} />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<Chat />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/api-keys" element={<ApiKeys />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
