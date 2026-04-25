'use client';
import { Fragment, useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bell, CheckCircle2, X, Loader2, Phone,
  RefreshCw, AlertCircle, Clock, MessageSquare, Search
} from 'lucide-react';
import { followupsApi } from '@/lib/api';
import { Followup, Pagination as PaginationType, FOLLOWUP_STATUS_COLORS } from '@/lib/types';
import { formatDate, today, isOverdue, isDueToday } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

function getStatusLabel(status?: string) {
  return status === 'Informed' ? 'Processing' : (status || '-');
}

function getDateFilterValue(searchParams: ReturnType<typeof useSearchParams>) {
  const dateParam = searchParams.get('date');
  if (dateParam === 'today') return today();
  return dateParam || today();
}

function getStatusFilterValue(searchParams: ReturnType<typeof useSearchParams>) {
  const statusParam = searchParams.get('status');
  return statusParam === 'Informed' ? 'Processing' : (statusParam || '');
}

function UpdateFollowupModal({ followup, onClose, onSaved }: { followup: Followup; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<Followup['status']>(followup.status === 'Informed' ? 'Processing' : followup.status);
  const [remarks, setRemarks] = useState('');
  const [reminder_date, setReminderDate] = useState('');
  const [saving, setSaving] = useState(false);
  const shouldShowReminder = !['Completed', 'No Answer'].includes(status);
  const followupHistory = followup.level_history || [];
  const minReminderDate = today();

  // Parse classifications
  const parseClassifications = (classifications: any) => {
    if (!classifications) return [];
    if (typeof classifications === 'string') {
      const trimmed = classifications.trim();
      if (!trimmed) return [];
      
      // Try JSON format first
      if (trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          // Not JSON, fall through to pipe format
        }
      }
      
      // Parse pipe-separated format: "11|TM|TAM,12|TM|TAM" or with semicolons
      const separator = trimmed.includes(';') ? ';' : ',';
      return trimmed.split(separator).map(item => {
        const parts = item.trim().split('|');
        if (parts.length === 3) {
          return {
            std: parts[0].trim(),
            medium: parts[1].trim(),
            subjects: [parts[2].trim()]
          };
        }
        return null;
      }).filter(Boolean);
    }
    return Array.isArray(classifications) ? classifications : [];
  };
  const parsedClassifications = parseClassifications(followup.classifications);

  async function handleSave() {
    if (shouldShowReminder && reminder_date && reminder_date < minReminderDate) {
      toast.error('Reminder date cannot be in the past');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = { status, remarks };
      if (shouldShowReminder) payload.reminder_date = reminder_date;
      const res = await followupsApi.update(followup.id, payload);
      toast.success('Followup updated');
      if (res.data?.next_followup) {
        toast.success('Next follow-up created automatically', { duration: 4000 });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900">Update Follow-up</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Teacher Details Section */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg text-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-bold text-ink-900 text-base">{followup.teacher_name}</p>
                <p className="text-ink-600 text-xs mt-0.5">ID: {followup.barcode || 'N/A'}</p>
                {followup.teacher_address && <p className="text-ink-600 text-xs mt-1"><span className="font-medium">Address:</span> {followup.teacher_address}</p>}
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="border-t border-blue-100 pt-2">
              <p className="text-xs font-semibold text-ink-700 uppercase mb-1.5">Contact</p>
              <div className="space-y-1">
                <p className="text-ink-700"><span className="font-medium">Phone:</span> {followup.contact_number || 'N/A'}</p>
                {followup.pincode && <p className="text-ink-700"><span className="font-medium">Pincode:</span> {followup.pincode}</p>}
                {followup.dt_code && <p className="text-ink-700"><span className="font-medium">DT Code:</span> {followup.dt_code}</p>}
              </div>
            </div>

            {/* School & Address Information */}
            <div className="border-t border-blue-100 pt-2">
              <p className="text-xs font-semibold text-ink-700 uppercase mb-1.5">School & Address</p>
              <div className="space-y-1">
                {followup.school_name && <p className="text-ink-700"><span className="font-medium">School:</span> {followup.school_name}</p>}
                {(followup.address_1 || followup.address_2 || followup.address_3) && (
                  <p className="text-ink-700">
                    <span className="font-medium">Address:</span> {[followup.address_1, followup.address_2, followup.address_3].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

     
            {/* Classifications Information */}
            <div className="border-t border-blue-100 pt-2">
              <p className="text-xs font-semibold text-ink-700 uppercase mb-2">Subject and Medium</p>
              {parsedClassifications.length > 0 ? (
                <div className="space-y-2">
                  {parsedClassifications.map((classification: any, idx: number) => (
                    <div key={idx} className="bg-white bg-opacity-60 rounded p-2 border border-blue-100">
                      <p className="text-ink-700"><span className="font-medium">Std:</span> {classification.std}</p>
                      <p className="text-ink-700"><span className="font-medium">Medium:</span> {classification.medium}</p>
                      {classification.subjects && Array.isArray(classification.subjects) && classification.subjects.length > 0 && (
                        <p className="text-ink-700"><span className="font-medium">Subjects:</span> {classification.subjects.join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-500 text-sm">No classifications available</p>
              )}
            </div>

            {/* Dispatch Information */}
            <div className="border-t border-blue-100 pt-2">
              <p className="text-xs font-semibold text-ink-700 uppercase mb-1.5">Dispatch Status</p>
              <div className="space-y-1">
                <p className="text-ink-700"><span className="font-medium">Dispatch Date:</span> {followup.dispatch_date ? formatDate(followup.dispatch_date) : 'N/A'}</p>
                {followup.dispatch_status && <p className="text-ink-700"><span className="font-medium">Status:</span> {followup.dispatch_status}</p>}
                {followup.delivered_date && <p className="text-ink-700"><span className="font-medium">Delivered:</span> {formatDate(followup.delivered_date)}</p>}
                {followup.pod_date && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-ink-700"><span className="font-medium">POD Date:</span> {formatDate(followup.pod_date)}</p>
                    {followup.po_number && (
                      <a 
                        href={`https://www.tpcindia.com/CaptchaGate.aspx?id=${followup.po_number}&type=0&service=0`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-ghost btn btn-xs text-brand-600 hover:text-brand-700"
                      >
                       {followup.po_number} View Status
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>No Answer</option>
            </select>
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea
              className="form-input resize-none"
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Call notes..."
            />
          </div>
          {shouldShowReminder && (
            <div>
              <label className="form-label">Reschedule Reminder</label>
              <input
                type="date"
                className="form-input"
                value={reminder_date}
                min={minReminderDate}
                onChange={e => setReminderDate(e.target.value)}
              />
            </div>
          )}
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg flex items-start gap-2">
            <CheckCircle2 size={15} className="text-brand-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-brand-700">
              Saving this form will create a new follow-up entry for this dispatch and keep the previous entries in history.
            </p>
          </div>
          {followupHistory.length > 0 && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Follow-up History</p>
              {followupHistory.map(level => (
                <div key={level.id} className="rounded-md border border-ink-100 bg-white p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`badge text-[11px] ${FOLLOWUP_STATUS_COLORS[level.status] || ''}`}>
                      {getStatusLabel(level.status)}
                    </span>
                  </div>
                  <p className="text-ink-500">Reminder: {formatDate(level.reminder_date)}</p>
                  <p className="text-ink-600">{level.remarks || 'No remarks'}</p>
                </div>
              ))}
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

function FollowupsContent() {
  const searchParams = useSearchParams();
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState(getDateFilterValue(searchParams));
  const [filterToDate, setFilterToDate] = useState(searchParams.get('to_date') || '');
  const [filterStatus, setFilterStatus] = useState(getStatusFilterValue(searchParams));
  const [updateTarget, setUpdateTarget] = useState<Followup | null>(null);

  useEffect(() => {
    setFilterDate(getDateFilterValue(searchParams));
    setFilterToDate(searchParams.get('to_date') || '');
    setFilterStatus(getStatusFilterValue(searchParams));
    setPage(1);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (searchQuery) params.search = searchQuery;
      if (filterDate) params.date = filterDate;
      if (filterToDate) params.to_date = filterToDate;
      if (filterStatus) params.status = filterStatus;
      params.dispatch_status = 'Delivered';
      const res = await followupsApi.list(params);
      setFollowups(res.data?.followups ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterDate, filterToDate, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = followups.filter(f => f.status === 'Pending' && isOverdue(f.reminder_date));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="page-title">Follow-ups</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          {pagination ? `${pagination.total} followup records` : 'Track and update teacher follow-ups'}
        </p>
      </div>

      {!loading && overdue.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-slide-up">
          <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{overdue.length} overdue follow-up{overdue.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-rose-600 mt-0.5">These have passed their reminder date and need attention</p>
          </div>
        </div>
      )}

      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by teacher, barcode, or contact..."
            className="form-input py-1.5 text-sm w-full"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-ink-400" />
          <input
            type="date"
            className="form-input py-1.5 text-sm w-40"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-ink-400" />
          <input
            type="date"
            className="form-input py-1.5 text-sm w-40"
            value={filterToDate}
            onChange={e => { setFilterToDate(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-select py-1.5 text-sm w-36"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Completed</option>
          <option>No Answer</option>
        </select>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => { setFilterDate(today()); setFilterToDate(''); setFilterStatus('Pending'); setPage(1); }}
            className="btn-secondary btn btn-sm"
          >
            <Clock size={13} /> Today
          </button>
          {(searchQuery || filterDate || filterToDate || filterStatus) && (
            <button
              onClick={() => { setSearchQuery(''); setFilterDate(today()); setFilterToDate(''); setFilterStatus(''); setPage(1); }}
              className="btn-ghost btn btn-sm"
            >
              <X size={13} /> Clear
            </button>
          )}
          <button onClick={load} className="btn-secondary btn btn-icon btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array(6).fill(0).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>
        ) : followups.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No follow-ups found"
            description="No follow-ups match the selected reminder date and status"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Contact</th>
                  <th>Dispatch Date</th>
                  <th>Reminder Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>PO Number</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {followups.map((f, idx) => {
                  const overdueItem = f.status === 'Pending' && isOverdue(f.reminder_date);
                  const dueToday = isDueToday(f.reminder_date);
                  return (
                    <Fragment key={f.id}>
                      <tr
                        className={`animate-fade-in ${overdueItem ? 'bg-rose-50/30' : dueToday ? 'bg-amber-50/30' : ''}`}
                        style={{ animationDelay: `${idx * 25}ms` }}
                      >
                        <td>
                          <p className="font-medium text-ink-900 text-sm">{f.teacher_name}</p>
                          <p className="text-xs text-ink-400 break-words">{f.teacher_address || '—'}</p>
                        </td>
                        <td>
                          <a
                            href={`tel:${f.contact_number}`}
                            className="flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand-600"
                          >
                            <Phone size={12} /> {f.contact_number}
                          </a>
                        </td>
                        <td className="text-sm text-ink-500 whitespace-nowrap">{formatDate(f.dispatch_date)}</td>
                        <td className="whitespace-nowrap">
                          <span className={`text-sm font-medium ${overdueItem ? 'text-rose-600' : dueToday ? 'text-amber-600' : 'text-ink-600'}`}>
                            {formatDate(f.reminder_date)}
                            {overdueItem && <span className="ml-1 text-xs">(overdue)</span>}
                            {dueToday && !overdueItem && <span className="ml-1 text-xs">(today)</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`badge text-xs ${FOLLOWUP_STATUS_COLORS[f.status] || ''}`}>
                            {getStatusLabel(f.status)}
                          </span>
                        </td>
                        <td className="max-w-[140px]">
                          <p className="text-xs text-ink-500 truncate">{f.remarks || '-'}</p>
                        </td>
                        <td className="text-sm whitespace-nowrap">
                          {f.po_number ? (
                            <div className="flex items-center gap-2">
                              <span>{f.po_number}</span>
                              <a href={`https://www.tpcindia.com/CaptchaGate.aspx?id=${f.po_number}&type=0&service=0`}
                                target="_blank" rel="noopener noreferrer"
                                className="btn-ghost btn btn-sm text-brand-600 hover:text-brand-700">
                                View
                              </a>
                            </div>
                          ) : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="text-right">
                          <button onClick={() => setUpdateTarget(f)} className="btn-primary btn btn-sm">
                            <MessageSquare size={13} /> Update
                          </button>
                        </td>
                      </tr>
                      {f.level_history && f.level_history.length > 0 && (
                        <tr className="bg-ink-50/60">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                                Follow-up History
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                {f.level_history.map(history => (
                                  <div key={history.id} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs text-ink-500">
                                    <p className="font-medium text-ink-800">{getStatusLabel(history.status)}</p>
                                    <p className="mt-1">Reminder: {formatDate(history.reminder_date)}</p>
                                    <p className="mt-1">{history.remarks || 'No remarks'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              limit={pagination.limit}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {updateTarget && (
        <UpdateFollowupModal
          followup={updateTarget}
          onClose={() => setUpdateTarget(null)}
          onSaved={load}
        />
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
