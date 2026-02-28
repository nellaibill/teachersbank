'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, UserX, Shield, User, Loader2, X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  isActive: number;
  last_login: string | null;
  created_at: string;
}

// ── User Form Modal ───────────────────────────────────────────────────────────
function UserFormModal({ user, onClose, onSaved }: { user?: UserRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name     || '',
    email:    user?.email    || '',
    password: '',
    role:     user?.role     || 'operator',
    isActive: user?.isActive ?? 1,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    if (!isEdit && !form.password) { toast.error('Password is required for new users'); return; }

    setSaving(true);
    try {
      const payload: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
      if (form.password) payload.password = form.password;

      if (isEdit) {
        await usersApi.update(user!.id, payload);
        toast.success('User updated');
      } else {
        await usersApi.create(payload);
        toast.success('User created');
      }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="font-semibold text-ink-900" style={{ fontFamily: 'Fraunces, serif' }}>
            {isEdit ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="form-label">Full Name <span className="text-rose-500">*</span></label>
            <input className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="form-label">Email Address <span className="text-rose-500">*</span></label>
            <input type="email" className="form-input" value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="form-label">{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className="form-input pr-10"
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Min 6 characters'} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={form.isActive} onChange={e => set('isActive', Number(e.target.value))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>

          {/* Role info */}
          <div className={`p-3 rounded-lg text-xs ${form.role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-ink-50 text-ink-600'}`}>
            {form.role === 'admin'
              ? '🔑 Admin — full access including user management and delete operations'
              : '👤 Operator — can view, add, and edit records but cannot delete or manage users'}
          </div>

          <div className="flex gap-3 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="btn-secondary btn flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary btn flex-1">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: authUser, isAdmin } = useAuth();
  const router = useRouter();
  const [users,    setUsers]    = useState<UserRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) { router.replace('/'); }
  }, [isAdmin, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data?.users ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDeactivate(u: UserRecord) {
    if (u.id === authUser?.id) { toast.error("You can't deactivate your own account"); return; }
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await usersApi.delete(u.id);
      toast.success('User deactivated');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-ink-500 mt-0.5">{users.length} users registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary btn btn-icon">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary btn">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-ink-500 bg-white rounded-lg px-3 py-2 border border-ink-100">
          <Shield size={13} className="text-brand-600" /> <strong>Admin</strong> — full access
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-500 bg-white rounded-lg px-3 py-2 border border-ink-100">
          <User size={13} className="text-ink-500" /> <strong>Operator</strong> — view, add, edit only
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 skeleton" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={User} title="No users found"
            action={<button onClick={() => setShowForm(true)} className="btn-primary btn"><Plus size={15} />Add User</button>} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} className="animate-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                  <td className="text-ink-400 text-xs font-mono">{u.id}</td>
                  <td>
                    <p className="font-medium text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-400">{u.email}</p>
                    {u.id === authUser?.id && (
                      <span className="badge bg-brand-100 text-brand-700 text-[10px] mt-0.5">You</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge text-xs ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'}`}>
                      {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge text-xs ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-xs text-ink-500">{u.last_login ? formatDateTime(u.last_login) : '—'}</td>
                  <td className="text-xs text-ink-500">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditUser(u); setShowForm(true); }}
                        className="btn-ghost btn btn-icon btn-sm text-brand-600">
                        <Edit2 size={14} />
                      </button>
                      {u.id !== authUser?.id && (
                        <button onClick={() => handleDeactivate(u)}
                          className="btn-ghost btn btn-icon btn-sm text-rose-500"
                          title="Deactivate">
                          <UserX size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <UserFormModal user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSaved={load} />
      )}
    </div>
  );
}
