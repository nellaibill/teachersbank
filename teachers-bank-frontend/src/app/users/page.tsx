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
 
      {/* Role legend */}


      {showForm && (
        <UserFormModal user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSaved={load} />
      )}
    </div>
  );
}
