import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [page, search]);

  const loadContacts = async () => {
    try {
      const { data } = await api.get(`/contacts?page=${page}&limit=20&search=${search}`);
      setContacts(data.contacts);
      setTotal(data.total);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editContact) {
        await api.put(`/contacts/${editContact.id}`, { phone, name });
        toast.success('تم التعديل');
      } else {
        await api.post('/contacts', { phone, name });
        toast.success('تمت الإضافة');
      }
      setShowForm(false);
      setEditContact(null);
      setName('');
      setPhone('');
      loadContacts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف جهة الاتصال؟')) return;
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('تم الحذف');
      loadContacts();
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const openEdit = (c) => {
    setEditContact(c);
    setName(c.name);
    setPhone(c.phone);
    setShowForm(true);
  };

  const openNew = () => {
    setEditContact(null);
    setName('');
    setPhone('');
    setShowForm(true);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-wa-sidebar border-b border-wa-hover px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">جهات الاتصال ({total})</h2>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-wa-green text-wa-teal text-sm font-bold rounded-lg hover:bg-wa-dark transition-colors"
        >
          + إضافة
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 bg-wa-sidebar border-b border-wa-hover">
        <input
          type="text"
          placeholder="بحث بالاسم أو الرقم..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full px-4 py-2 bg-wa-input rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            لا توجد جهات اتصال
          </div>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-6 py-3 border-b border-wa-hover hover:bg-wa-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wa-input flex items-center justify-center text-wa-green font-bold">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-wa-input rounded transition-colors"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 bg-wa-sidebar border-t border-wa-hover flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-30"
          >
            السابق
          </button>
          <span className="text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-30"
          >
            التالي
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-wa-sidebar rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">
              {editContact ? 'تعديل جهة اتصال' : 'إضافة جهة اتصال'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="الاسم"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-wa-input rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
                required
              />
              <input
                type="text"
                placeholder="رقم الجوال (9665...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-wa-input rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-wa-green"
                required
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-wa-green text-wa-teal font-bold rounded-lg hover:bg-wa-dark transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? 'جاري...' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditContact(null); }}
                  className="flex-1 py-3 bg-wa-input text-gray-300 rounded-lg hover:bg-wa-hover transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
