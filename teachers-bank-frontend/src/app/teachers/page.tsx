'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus, Search, Filter, Edit2, Trash2, Eye,
  Phone, MapPin, X, Loader2, Users, RefreshCw
} from 'lucide-react';
import { teachersApi } from '@/lib/api';
import { Teacher, Pagination as PaginationType, SCHOOL_TYPES, MEDIUMS, STANDARDS, DISPATCH_STATUS_COLORS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import TeacherFormModal from '@/components/teachers/TeacherFormModal';
import TeacherDetailModal from '@/components/teachers/TeacherDetailModal';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

function TeachersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [teachers, setTeachers]         = useState<Teacher[]>([]);
  const [pagination, setPagination]     = useState<PaginationType | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [filters, setFilters]           = useState({ dt_code: '', sub_code: '', std: '', medium: '', school_type: '', isActive: '1' });
  const [showFilters, setShowFilters]   = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [editTeacher, setEditTeacher]   = useState<Teacher | null>(null);
  const [viewTeacher, setViewTeacher]   = useState<Teacher | null>(null);

  // Open new form if ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') setShowForm(true);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, ...filters };
      if (search.trim()) params.search = search.trim();
      const res = await teachersApi.list(params);
      setTeachers(res.data?.teachers ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(t: Teacher) {
    if (!confirm(`Deactivate ${t.teacher_name}?`)) return;
    try {
      await teachersApi.delete(t.id);
      toast.success('Teacher deactivated');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to deactivate');
    }
  }

  const activeFilters = Object.entries(filters).filter(([k, v]) => v && !(k === 'isActive' && v === '1')).length;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {pagination ? `${pagination.total} teachers registered` : 'Manage teacher records'}
          </p>
        </div>
        <button onClick={() => { setEditTeacher(null); setShowForm(true); }} className="btn-primary btn">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      {/* Search + filters bar */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="form-input pl-9" placeholder="Search by name, phone, school…" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} relative`}>
            <Filter size={15} /> Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button onClick={load} className="btn-secondary btn btn-icon" title="Refresh">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-ink-100 animate-slide-up">
            <div>
              <label className="form-label">DT Code</label>
              <input className="form-input" value={filters.dt_code}
                onChange={e => { setFilters(f => ({ ...f, dt_code: e.target.value.toUpperCase() })); setPage(1); }}
                placeholder="ARL" />
            </div>
            <div>
              <label className="form-label">Subject</label>
              <input className="form-input" value={filters.sub_code}
                onChange={e => { setFilters(f => ({ ...f, sub_code: e.target.value.toUpperCase() })); setPage(1); }}
                placeholder="MAT" />
            </div>
            <div>
              <label className="form-label">Standard</label>
              <select className="form-select" value={filters.std}
                onChange={e => { setFilters(f => ({ ...f, std: e.target.value })); setPage(1); }}>
                <option value="">All</option>
                {STANDARDS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Medium</label>
              <select className="form-select" value={filters.medium}
                onChange={e => { setFilters(f => ({ ...f, medium: e.target.value })); setPage(1); }}>
                <option value="">All</option>
                {MEDIUMS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">School Type</label>
              <select className="form-select" value={filters.school_type}
                onChange={e => { setFilters(f => ({ ...f, school_type: e.target.value })); setPage(1); }}>
                <option value="">All</option>
                {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={filters.isActive}
                onChange={e => { setFilters(f => ({ ...f, isActive: e.target.value })); setPage(1); }}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
                <option value="">All</option>
              </select>
            </div>
            {activeFilters > 0 && (
              <div className="flex items-end">
                <button onClick={() => { setFilters({ dt_code: '', sub_code: '', std: '', medium: '', school_type: '', isActive: '1' }); setPage(1); }}
                  className="btn-ghost btn btn-sm w-full">
                  <X size={13} /> Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState icon={Users} title="No teachers found"
            description="Try adjusting your filters or add a new teacher"
            action={<button onClick={() => setShowForm(true)} className="btn-primary btn"><Plus size={15} />Add Teacher</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Teacher</th>
                  <th>Contact</th>
                  <th>District / Subject</th>
                  <th>Std / Medium</th>
                  <th>School</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => (
                  <tr key={t.id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                    <td className="text-ink-400 font-mono text-xs w-10">{t.id}</td>
                    <td>
                      <p className="font-medium text-ink-900">{t.teacher_name}</p>
                      <p className="text-xs text-ink-400 font-mono mt-0.5">{t.barcode}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-ink-700">
                        <Phone size={12} className="text-ink-400 flex-shrink-0" />
                        {t.contact_number}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        {t.dt_code && <span className="badge bg-ink-100 text-ink-600">{t.dt_code}</span>}
                        {t.sub_code && <span className="badge bg-brand-100 text-brand-700">{t.sub_code}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        {t.std && <span className="badge bg-amber-100 text-amber-700">Std {t.std}</span>}
                        {t.medium && <span className="badge bg-ink-100 text-ink-600">{t.medium}</span>}
                      </div>
                    </td>
                    <td className="max-w-[180px]">
                      <p className="text-sm text-ink-700 truncate">{t.school_name || '—'}</p>
                      {t.school_type && <p className="text-xs text-ink-400">{t.school_type}</p>}
                    </td>
                    <td>
                      <span className={`badge ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewTeacher(t)}
                          className="btn-ghost btn btn-icon btn-sm text-ink-500" title="View">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => { setEditTeacher(t); setShowForm(true); }}
                          className="btn-ghost btn btn-icon btn-sm text-brand-600" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(t)}
                          className="btn-ghost btn btn-icon btn-sm text-rose-500" title="Deactivate">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pagination.total_pages}
              total={pagination.total} limit={pagination.limit}
              onChange={p => { setPage(p); window.scrollTo(0, 0); }} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <TeacherFormModal
          teacher={editTeacher}
          onClose={() => { setShowForm(false); setEditTeacher(null); }}
          onSaved={load}
        />
      )}
      {viewTeacher && (
        <TeacherDetailModal
          teacher={viewTeacher}
          onClose={() => setViewTeacher(null)}
          onEdit={t => { setViewTeacher(null); setEditTeacher(t); setShowForm(true); }}
        />
      )}
    </div>
  );
}

export default function TeachersPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>}>
      <TeachersContent />
    </Suspense>
  );
}
