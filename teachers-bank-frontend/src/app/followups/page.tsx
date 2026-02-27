'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bell, CheckCircle2, X, Loader2, Phone,
  RefreshCw, AlertCircle, Clock, Filter, MessageSquare
} from 'lucide-react';
import { followupsApi } from '@/lib/api';
import { Followup, Pagination as PaginationType, FOLLOWUP_STATUS_COLORS } from '@/lib/types';
import { formatDate, today, isOverdue, isDueToday } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

// ── Update followup modal ─────────────────────────────────────────────────────
function UpdateFollowupModal({ followup, onClose, onSaved }: { followup: Followup; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus]               = useState(followup.status);
  const [remarks, setRemarks]             = useState(followup.remarks || '');
  const [reminder_date, setReminderDate]  = useState(followup.reminder_date || '');
  const [saving, setSaving]               = useState(false);
  const willCreateNext = ['Informed', 'Completed'].includes(status) && followup.followup_level < 4;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await followupsApi.update(followup.id, { status, remarks, reminder_date });
      toast.success('Followup updated');
      if (res.data?.next_followup) {
        toast.success(`Level ${res.data.next_followup.followup_level} followup created automatically`, { duration: 4000 });
      }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900">Update Follow-up</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="p-3 bg-ink-50 rounded-lg text-sm">
            <p className="font-medium text-ink-800">{followup.teacher_name}</p>
            <p className="text-ink-500 text-xs">{followup.contact_number} · Level {followup.followup_level}</p>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option>Pending</option>
              <option>Informed</option>
              <option>Completed</option>
              <option>No Answer</option>
            </select>
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea className="form-input resize-none" rows={3} value={remarks}
              onChange={e => setRemarks(e.target.value)} placeholder="Call notes…" />
          </div>
          <div>
            <label className="form-label">Reschedule Reminder</label>
            <input type="date" className="form-input" value={reminder_date}
              onChange={e => setReminderDate(e.target.value)} />
          </div>
          {willCreateNext && (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg flex items-start gap-2">
              <CheckCircle2 size={15} className="text-brand-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-brand-700">
                Marking as <strong>{status}</strong> will auto-create a Level {followup.followup_level + 1} follow-up.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary btn flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn flex-1">
              {saving && <Loader2 size={14} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────
const LEVEL_COLORS = ['', 'bg-brand-100 text-brand-700', 'bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-rose-100 text-rose-600'];

function FollowupsContent() {
  const searchParams = useSearchParams();
  const [followups, setFollowups]         = useState<Followup[]>([]);
  const [pagination, setPagination]       = useState<PaginationType | null>(null);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [filterDate, setFilterDate]       = useState(searchParams.get('date') === 'today' ? today() : '');
  const [filterStatus, setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterLevel, setFilterLevel]     = useState('');
  const [updateTarget, setUpdateTarget]   = useState<Followup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterDate)   params.date   = filterDate;
      if (filterStatus) params.status = filterStatus;
      if (filterLevel)  params.followup_level = filterLevel;
      const res = await followupsApi.list(params);
      setFollowups(res.data?.followups ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, filterDate, filterStatus, filterLevel]);

  useEffect(() => { load(); }, [load]);

  const overdue = followups.filter(f => f.status === 'Pending' && isOverdue(f.reminder_date));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="page-title">Follow-ups</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          {pagination ? `${pagination.total} followup records` : 'Track and update teacher follow-ups'}
        </p>
      </div>

      {/* Overdue alert */}
      {!loading && overdue.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-slide-up">
          <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{overdue.length} overdue follow-up{overdue.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-rose-600 mt-0.5">These have passed their reminder date and need attention</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-ink-400" />
          <input type="date" className="form-input py-1.5 text-sm w-40" value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select py-1.5 text-sm w-36" value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Informed</option>
          <option>Completed</option>
          <option>No Answer</option>
        </select>
        <select className="form-select py-1.5 text-sm w-32" value={filterLevel}
          onChange={e => { setFilterLevel(e.target.value); setPage(1); }}>
          <option value="">All Levels</option>
          {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => { setFilterDate(today()); setFilterStatus('Pending'); setPage(1); }}
            className="btn-secondary btn btn-sm">
            <Clock size={13} /> Today
          </button>
          {(filterDate || filterStatus || filterLevel) && (
            <button onClick={() => { setFilterDate(''); setFilterStatus(''); setFilterLevel(''); setPage(1); }}
              className="btn-ghost btn btn-sm">
              <X size={13} /> Clear
            </button>
          )}
          <button onClick={load} className="btn-secondary btn btn-icon btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>
        ) : followups.length === 0 ? (
          <EmptyState icon={Bell} title="No follow-ups found"
            description="Dispatch a parcel first — Level 1 follow-ups are created automatically" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Contact</th>
                  <th>Dispatch Date</th>
                  <th>Reminder Date</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {followups.map((f, idx) => {
                  const overdue = f.status === 'Pending' && isOverdue(f.reminder_date);
                  const dueToday = isDueToday(f.reminder_date);
                  return (
                    <tr key={f.id} className={`animate-fade-in ${overdue ? 'bg-rose-50/30' : dueToday ? 'bg-amber-50/30' : ''}`}
                      style={{ animationDelay: `${idx * 25}ms` }}>
                      <td>
                        <p className="font-medium text-ink-900 text-sm">{f.teacher_name}</p>
                        <p className="text-xs text-ink-400 truncate max-w-[150px]">{f.school_name}</p>
                      </td>
                      <td>
                        <a href={`tel:${f.contact_number}`}
                          className="flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-600">
                          <Phone size={12} /> {f.contact_number}
                        </a>
                      </td>
                      <td className="text-sm text-ink-500 whitespace-nowrap">{formatDate(f.dispatch_date)}</td>
                      <td className="whitespace-nowrap">
                        <span className={`text-sm font-medium ${overdue ? 'text-rose-600' : dueToday ? 'text-amber-600' : 'text-ink-600'}`}>
                          {formatDate(f.reminder_date)}
                          {overdue && <span className="ml-1 text-xs">(overdue)</span>}
                          {dueToday && !overdue && <span className="ml-1 text-xs">(today)</span>}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs ${LEVEL_COLORS[f.followup_level] || 'bg-ink-100 text-ink-600'}`}>
                          Level {f.followup_level}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs ${FOLLOWUP_STATUS_COLORS[f.status] || ''}`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="max-w-[140px]">
                        <p className="text-xs text-ink-500 truncate">{f.remarks || '—'}</p>
                      </td>
                      <td className="text-right">
                        <button onClick={() => setUpdateTarget(f)}
                          className="btn-primary btn btn-sm">
                          <MessageSquare size={13} /> Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={pagination.total_pages}
              total={pagination.total} limit={pagination.limit} onChange={setPage} />
          </div>
        )}
      </div>

      {updateTarget && (
        <UpdateFollowupModal followup={updateTarget}
          onClose={() => setUpdateTarget(null)} onSaved={load} />
      )}
    </div>
  );
}

export default function FollowupsPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>}>
      <FollowupsContent />
    </Suspense>
  );
}
