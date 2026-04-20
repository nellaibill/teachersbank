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
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

function escapeExcelValue(value: unknown) {
  return String(value ?? '')
    .replace(/"/g, '""');
}

function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csvLines = [
    headers.map(header => `"${escapeExcelValue(header)}"`).join(','),
    ...rows.map(row => row.map(cell => `"${escapeExcelValue(cell)}"`).join(',')),
  ];

  const blob = new Blob([`\ufeff${csvLines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
            <p className="text-emerald-700 font-medium">ℹ️ Update delivery status to trigger follow-up reminder</p>
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
  const [delivered_date, setDeliveredDate] = useState(dispatch.delivered_date || '');
  const [pod_date, setPodDate] = useState(dispatch.pod_date || '');
  const [po_number, setPoNumber] = useState(dispatch.po_number || '');
  const [status, setStatus]   = useState(dispatch.status);
  const [saving, setSaving]   = useState(false);
  const isDelivered = status === 'Delivered';
  const isDispatched = status === 'Dispatched';
  const minAllowedDate = dispatch.dispatch_date;

  async function handleSave() {
    // Validation for Delivered status
    if (isDelivered && !delivered_date) {
      toast.error('Delivery date is required when status is Delivered');
      return;
    }
    if (isDelivered && delivered_date < minAllowedDate) {
      toast.error('Delivery date cannot be before dispatch date');
      return;
    }

    if (!pod_date) {
      toast.error('POD date is required');
      return;
    }

    if (pod_date < minAllowedDate) {
      toast.error('POD date cannot be before dispatch date');
      return;
    }

    // Validation for Dispatched status
    if (isDispatched && !po_number.trim()) {
      toast.error('POD Number is required when status is Dispatched');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = { status };
      
      if (isDelivered) {
        updateData.delivered_date = delivered_date;
      }
      if (isDispatched) {
        updateData.po_number = po_number;
      }
      if (pod_date) {
        updateData.pod_date = pod_date;
      }

      await dispatchApi.update(dispatch.id, updateData);
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
          <p className="text-sm text-ink-600"><strong>{dispatch.teacher_name}</strong> — {dispatch.teacher_address || 'N/A'}</p>
          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option>Dispatched</option>
              <option>Delivered</option>
              <option>Returned</option>
            </select>
          </div>

          {/* ── POD Number Field (for Dispatched) ──────────────────────────────────*/}
          {isDispatched && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="form-label text-blue-900 font-semibold">POD Number *</label>
              <input
                className="form-input"
                value={po_number}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="Proof of delivery number"
              />
            </div>
          )}

          {/* ── Delivery Date Field (for Delivered) ────────────────────────────*/}
          {isDelivered && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <label className="form-label text-emerald-900 font-semibold">Delivery Date *</label>
              <input 
                type="date" 
                className="form-input" 
                value={delivered_date} 
                onChange={e => setDeliveredDate(e.target.value)}
                min={minAllowedDate}
                required
              />
              <p className="text-xs text-emerald-700 mt-2">Date when the teacher received the materials</p>
              <p className="text-xs text-emerald-600 mt-2 font-semibold">✅ A follow-up reminder will be automatically created (delivery date + 10 days)</p>
            </div>
          )}

          {/* ── POD Date (Always shown) ────────────────────────────────────────*/}
          <div>
            <label className="form-label">POD Date (Proof of Delivery) *</label>
            <input 
              type="date" 
              className="form-input" 
              value={pod_date} 
              onChange={e => setPodDate(e.target.value)}
              min={minAllowedDate}
              required
            />
            <p className="text-xs text-ink-400 mt-1">Enter the official proof-of-delivery date. This field is mandatory.</p>
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
  const { isManager } = useAuth();
  const [barcode, setBarcode]           = useState('');
  const [dispatchDate, setDispatchDate] = useState(today());
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState<any>(null);
  const [dispatches, setDispatches]     = useState<Dispatch[]>([]);
  const [pagination, setPagination]     = useState<PaginationType | null>(null);
  const [loading, setLoading]           = useState(true);
  const [exporting, setExporting]       = useState(false);
  const [page, setPage]                 = useState(1);
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [updateTarget, setUpdateTarget] = useState<Dispatch | null>(null);
  const [limit, setLimit] = useState(20);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Ctrl+B shortcut to focus barcode input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (filterStatus) params.status = filterStatus;
      if (filterFromDate) params.from_date = filterFromDate;
      if (filterToDate) params.to_date = filterToDate;
      if (searchQuery) params.search = searchQuery;
      const res = await dispatchApi.list(params);
      setDispatches(res.data?.dispatches ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, limit, filterStatus, filterFromDate, filterToDate, searchQuery]);

  useEffect(() => { loadDispatches(); }, [loadDispatches]);

  const exportDispatches = useCallback(() => {
    setExporting(true);
    (async () => {
      try {
      const baseParams: any = { limit: 100 };
      if (filterStatus) baseParams.status = filterStatus;
      if (filterFromDate) baseParams.from_date = filterFromDate;
      if (filterToDate) baseParams.to_date = filterToDate;
      if (searchQuery) baseParams.search = searchQuery;

      const firstRes = await dispatchApi.list({ ...baseParams, page: 1 });
      const firstRows = firstRes.data?.dispatches ?? [];
      const totalPages = firstRes.data?.pagination?.total_pages ?? 1;
      const exportRows: Dispatch[] = [...firstRows];

      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const pageRes = await dispatchApi.list({ ...baseParams, page: currentPage });
        const pageRows = pageRes.data?.dispatches ?? [];
        exportRows.push(...pageRows);
      }

      if (exportRows.length === 0) {
        toast.error('No dispatch data available to export');
        return;
      }

      const rows = exportRows.map((dispatch: Dispatch, index: number) => [
        index + 1,
        dispatch.teacher_name || '',
        dispatch.school_name || '',
        dispatch.contact_number || '',
        dispatch.barcode || '',
        dispatch.dispatch_date ? formatDate(dispatch.dispatch_date) : '',
        dispatch.delivered_date ? formatDate(dispatch.delivered_date) : '',
        dispatch.pod_date ? formatDate(dispatch.pod_date) : '',
        dispatch.status,
        dispatch.po_number || '',
      ]);

      const filenameDate = filterFromDate || today();
      downloadCsvFile(
        `dispatch-report-${filenameDate}.csv`,
        ['Sl. No.', 'Teacher', 'School', 'Contact', 'Barcode', 'Dispatch Date', 'Delivered Date', 'POD Date', 'Status', 'POD Number'],
        rows,
      );
      toast.success(`Exported ${exportRows.length} dispatch record${exportRows.length === 1 ? '' : 's'}`);
      } catch (e: any) {
        toast.error(e.message || 'Failed to export dispatch data');
      } finally {
        setExporting(false);
      }
    })();
  }, [filterStatus, filterFromDate, filterToDate, searchQuery]);

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

      <div className="space-y-5">
        {/* Scanner panel */}
        <div className="space-y-4">
          {isManager ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Manager access is view-only. Dispatch creation and updates are disabled.
            </div>
          ) : (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <Scan size={16} className="text-brand-600" />
                </div>
                <h2 className="font-semibold text-ink-800">Scan Barcode</h2>
              </div>

              <form onSubmit={handleScan} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_160px] md:items-start">
                  <div>
                    <label className="form-label">Dispatch Date</label>
                    <input type="date" className="form-input" value={dispatchDate}
                      onChange={e => setDispatchDate(e.target.value)} />
                  </div>

                  <div>
                    <label className="form-label">Barcode</label>
                    <input ref={inputRef} autoFocus className="form-input font-mono"
                      value={barcode} onChange={e => setBarcode(e.target.value)}
                      placeholder="Scan or type barcode…"
                      disabled={scanning} />
                  </div>

                  <button type="submit" disabled={scanning || !barcode.trim()} className="btn-primary btn w-full md:mt-[26px]">
                    {scanning ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><Scan size={15} /> Dispatch</>}
                  </button>
                </div>

                <p className="text-xs text-ink-400 md:pl-[193px]">Connect a barcode scanner or type manually</p>

                {barcode && (
                  <div className="p-3 bg-ink-50 rounded-lg">
                    <BarcodeDisplay value={barcode} height={48} fontSize={10} />
                  </div>
                )}
              </form>
            </div>
          )}

          {scanResult && <ScanResult result={scanResult} onClear={() => setScanResult(null)} />}
        </div>

        {/* Dispatch list */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-3 space-y-3">
            {/* Date filters and status */}
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="form-label text-xs">From Date</label>
                <input type="date" className="form-input py-1.5 text-sm" value={filterFromDate}
                  onChange={e => { setFilterFromDate(e.target.value); setPage(1); }} />
              </div>
              <div>
                <label className="form-label text-xs">To Date</label>
                <input type="date" className="form-input py-1.5 text-sm" value={filterToDate}
                  onChange={e => { setFilterToDate(e.target.value); setPage(1); }} />
              </div>
              <select className="form-select py-1.5 text-sm flex-1 min-w-[120px]" value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option>Dispatched</option>
                <option>Delivered</option>
                <option>Returned</option>
                <option>Pending</option>
              </select>
              {(filterFromDate || filterToDate || filterStatus) && (
                <button onClick={() => { setFilterFromDate(''); setFilterToDate(''); setFilterStatus(''); setPage(1); }}
                  className="btn-ghost btn btn-sm">
                  <X size={13} /> Clear Filters
                </button>
              )}
            </div>

            {/* Search box */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="form-label text-xs">{filterStatus === 'Dispatched' ? 'POD Number Search' : 'Search'}</label>
                <input type="text" className="form-input py-1.5 text-sm" 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder={filterStatus === 'Dispatched'
                    ? 'Shows records with POD Number; search by POD Number'
                    : 'Teacher name, contact number, school, or POD number'} />
              </div>
              <div>
                <label className="form-label text-xs">Rows</label>
                <select
                  className="form-select py-1.5 text-sm min-w-[90px]"
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="btn-ghost btn btn-sm">
                  <X size={13} /> Clear Search
                </button>
              )}
              {!isManager && (
                <button onClick={exportDispatches} disabled={exporting} className="btn-primary btn btn-sm">
                  {exporting ? <><Loader2 size={14} className="animate-spin" /> Exporting...</> : 'Download CSV'}
                </button>
              )}
              <button onClick={loadDispatches} className="btn-secondary btn btn-icon btn-sm">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>
            ) : dispatches.length === 0 ? (
              <EmptyState icon={Package} title="No dispatches found"
                description={filterFromDate || filterToDate || filterStatus || searchQuery ? 'No results match your filters' : 'Scan a barcode above to create the first dispatch'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sl. No.</th>
                      <th>Teacher</th>
                      <th>Contact</th>
                      <th>Dispatch Date</th>
                      <th>POD Number</th>
                      <th>Delivered Date</th>
                      <th>POD Date</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((d, idx) => (
                      <tr key={d.id} style={{ animationDelay: `${idx * 25}ms` }} className="animate-fade-in">
                        <td className="text-sm text-ink-500 whitespace-nowrap">{(page - 1) * (pagination?.limit || limit) + idx + 1}</td>
                        <td>
                          <p className="font-medium text-ink-900 text-sm">{d.teacher_name}</p>
                          <p className="text-xs text-ink-400 break-words">{d.teacher_address || '—'}</p>
                        </td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{d.contact_number || '—'}</td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{formatDate(d.dispatch_date)}</td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">
                          {d.po_number ? (
                            <div className="flex items-center gap-2">
                              <span>{d.po_number}</span>
                              <a href={`https://www.tpcindia.com/CaptchaGate.aspx?id=${d.po_number}&type=0&service=0`}
                                target="_blank" rel="noopener noreferrer"
                                className="btn-ghost btn btn-sm text-brand-600 hover:text-brand-700">
                                View
                              </a>
                            </div>
                          ) : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{d.delivered_date ? formatDate(d.delivered_date) : <span className="text-ink-300">—</span>}</td>
                        <td className="text-sm text-ink-600 whitespace-nowrap">{d.pod_date ? formatDate(d.pod_date) : <span className="text-ink-300">—</span>}</td>
                        <td>
                          <span className={`badge text-xs ${
                            d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'Returned'  ? 'bg-rose-100 text-rose-600' :
                            'bg-brand-100 text-brand-700'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="text-right">
                          {isManager ? (
                            <span className="text-xs text-ink-400">View only</span>
                          ) : (
                            <button onClick={() => setUpdateTarget(d)}
                              className="btn-ghost btn btn-sm text-brand-600">
                              Update <ChevronDown size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination && (
              pagination.total_pages > 1 ? (
                <div className="px-4 pb-4">
                  <Pagination page={page} totalPages={pagination.total_pages}
                    total={pagination.total} limit={pagination.limit} onChange={setPage} />
                </div>
              ) : null
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



