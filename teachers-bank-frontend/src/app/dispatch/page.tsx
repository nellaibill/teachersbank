'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Package, Scan, Check, AlertTriangle, RefreshCw,
  Calendar, Filter, X, Loader2, ChevronDown
} from 'lucide-react';
import { dispatchApi } from '@/lib/api';
import { Dispatch, Pagination as PaginationType } from '@/lib/types';
import { formatDate, today } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import toast from 'react-hot-toast';

// ── Scan result banner ────────────────────────────────────────────────────────
function ScanResult({ result, onClear }: { result: any; onClear: () => void }) {
  if (!result) return null;
  const success = result.success;
  return (
    <div className={`rounded-xl p-4 flex items-start gap-3 animate-slide-up ${success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${success ? 'bg-emerald-100' : 'bg-rose-100'}`}>
        {success ? <Check size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-500" />}
      </div>
      <div className="flex-1">
        <p className={`font-semibold text-sm ${success ? 'text-emerald-800' : 'text-rose-700'}`}>
          {success ? 'Dispatch Successful!' : 'Dispatch Failed'}
        </p>
        <p className="text-sm mt-0.5 text-ink-600">{result.message}</p>
        {success && result.data?.dispatch && (
          <div className="mt-2 text-xs text-ink-500 space-y-0.5">
            <p><strong>Teacher:</strong> {result.data.dispatch.teacher_name}</p>
            <p><strong>School:</strong> {result.data.dispatch.school_name}</p>
            <p><strong>Follow-up reminder:</strong> {formatDate(result.data.reminder_date)}</p>
          </div>
        )}
      </div>
      <button onClick={onClear} className="text-ink-400 hover:text-ink-600 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

// ── Update Dispatch Modal ─────────────────────────────────────────────────────
function UpdateDispatchModal({ dispatch, onClose, onSaved }: { dispatch: Dispatch; onClose: () => void; onSaved: () => void }) {
  const [pod_date, setPodDate] = useState(dispatch.pod_date || '');
  const [status, setStatus]   = useState(dispatch.status);
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await dispatchApi.update(dispatch.id, { pod_date: pod_date || undefined, status });
      toast.success('Dispatch updated');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-900">Update Dispatch</h3>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-ink-600"><strong>{dispatch.teacher_name}</strong> — {formatDate(dispatch.dispatch_date)}</p>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option>Dispatched</option>
              <option>Delivered</option>
              <option>Returned</option>
            </select>
          </div>
          <div>
            <label className="form-label">POD Date</label>
            <input type="date" className="form-input" value={pod_date} onChange={e => setPodDate(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
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

export default function DispatchPage() {
  const [barcode, setBarcode]           = useState('');
  const [dispatchDate, setDispatchDate] = useState(today());
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState<any>(null);
  const [dispatches, setDispatches]     = useState<Dispatch[]>([]);
  const [pagination, setPagination]     = useState<PaginationType | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [filterDate, setFilterDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updateTarget, setUpdateTarget] = useState<Dispatch | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterDate)   params.date   = filterDate;
      if (filterStatus) params.status = filterStatus;
      const res = await dispatchApi.list(params);
      setDispatches(res.data?.dispatches ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, filterDate, filterStatus]);

  useEffect(() => { loadDispatches(); }, [loadDispatches]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await dispatchApi.scan(barcode.trim(), dispatchDate);
      setScanResult({ success: true, message: res.message, data: res.data });
      setBarcode('');
      loadDispatches();
    } catch (err: any) {
      setScanResult({ success: false, message: err.message || 'Dispatch failed' });
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="page-title">Dispatch</h1>
        <p className="text-sm text-ink-500 mt-0.5">Scan barcodes to record dispatches</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Scanner panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                <Scan size={16} className="text-brand-600" />
              </div>
              <h2 className="font-semibold text-ink-800">Scan Barcode</h2>
            </div>

            <div>
              <label className="form-label">Dispatch Date</label>
              <input type="date" className="form-input" value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)} />
            </div>

            <form onSubmit={handleScan} className="space-y-3">
              <div>
                <label className="form-label">Barcode</label>
                <input ref={inputRef} autoFocus className="form-input font-mono"
                  value={barcode} onChange={e => setBarcode(e.target.value)}
                  placeholder="Scan or type barcode…"
                  disabled={scanning} />
                <p className="text-xs text-ink-400 mt-1">Connect a barcode scanner or type manually</p>
              </div>

              {barcode && (
                <div className="p-3 bg-ink-50 rounded-lg">
                  <BarcodeDisplay value={barcode} height={48} fontSize={10} />
                </div>
              )}

              <button type="submit" disabled={scanning || !barcode.trim()} className="btn-primary btn w-full">
                {scanning ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><Scan size={15} /> Dispatch</>}
              </button>
            </form>
          </div>

          {scanResult && <ScanResult result={scanResult} onClear={() => setScanResult(null)} />}
        </div>

        {/* Dispatch list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card p-3 flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
              <Calendar size={14} className="text-ink-400 flex-shrink-0" />
              <input type="date" className="form-input py-1.5 text-sm" value={filterDate}
                onChange={e => { setFilterDate(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select py-1.5 text-sm flex-1 min-w-[120px]" value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option>Dispatched</option>
              <option>Delivered</option>
              <option>Returned</option>
            </select>
            {(filterDate || filterStatus) && (
              <button onClick={() => { setFilterDate(''); setFilterStatus(''); setPage(1); }}
                className="btn-ghost btn btn-sm">
                <X size={13} /> Clear
              </button>
            )}
            <button onClick={loadDispatches} className="btn-secondary btn btn-icon btn-sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>
            ) : dispatches.length === 0 ? (
              <EmptyState icon={Package} title="No dispatches found"
                description="Scan a barcode above to create the first dispatch" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Teacher</th>
                      <th>Dispatch Date</th>
                      <th>POD Date</th>
                      <th>Status</th>
                      <th>Follow-ups</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((d, idx) => (
                      <tr key={d.id} style={{ animationDelay: `${idx * 25}ms` }} className="animate-fade-in">
                        <td>
                          <p className="font-medium text-ink-900 text-sm">{d.teacher_name}</p>
                          <p className="text-xs text-ink-400 truncate max-w-[160px]">{d.school_name}</p>
                        </td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{formatDate(d.dispatch_date)}</td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{d.pod_date ? formatDate(d.pod_date) : <span className="text-ink-300">—</span>}</td>
                        <td>
                          <span className={`badge text-xs ${
                            d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'Returned'  ? 'bg-rose-100 text-rose-600' :
                            'bg-brand-100 text-brand-700'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td>
                          {(d.followup_count ?? 0) > 0 ? (
                            <span className="badge bg-amber-100 text-amber-700 text-xs">
                              {d.followup_count} followup{d.followup_count !== 1 ? 's' : ''}
                            </span>
                          ) : <span className="text-ink-300 text-xs">—</span>}
                        </td>
                        <td className="text-right">
                          <button onClick={() => setUpdateTarget(d)}
                            className="btn-ghost btn btn-sm text-brand-600">
                            Update <ChevronDown size={13} />
                          </button>
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
                  total={pagination.total} limit={pagination.limit} onChange={setPage} />
              </div>
            )}
          </div>
        </div>
      </div>

      {updateTarget && (
        <UpdateDispatchModal dispatch={updateTarget}
          onClose={() => setUpdateTarget(null)} onSaved={loadDispatches} />
      )}
    </div>
  );
}
