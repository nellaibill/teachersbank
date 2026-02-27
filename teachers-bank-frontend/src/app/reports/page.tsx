'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart2, Printer, Download, RefreshCw, Filter, X, Loader2, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { SCHOOL_TYPES, MEDIUMS, STANDARDS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'consolidated',   label: 'Consolidated',   desc: 'All teachers with dispatch & followup summary' },
  { id: 'label',          label: 'Mailing Labels',  desc: 'Print-ready address labels with barcodes' },
  { id: 'dispatch',       label: 'Dispatch Report', desc: 'Dispatch history with filters' },
  { id: 'school_address', label: 'School Address',  desc: 'School address labels for mailing' },
];

// ── Label card for printing ───────────────────────────────────────────────────
function LabelCard({ label }: { label: any }) {
  return (
    <div className="border-2 border-ink-200 rounded-lg p-3 text-left print:border print:border-black print:rounded-none" style={{ minHeight: 120 }}>
      {label.barcode && (
        <div className="mb-2">
          <BarcodeDisplay value={label.barcode} height={40} fontSize={9} width={1.5} />
        </div>
      )}
      <p className="font-bold text-sm text-ink-900 leading-tight">{label.teacher_name}</p>
      {label.full_address && (
        <p className="text-xs text-ink-600 mt-1 leading-snug whitespace-pre-line">{label.full_address}</p>
      )}
      <p className="text-xs text-ink-500 mt-1">Ph: {label.contact_number}</p>
    </div>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const [reportType, setReportType]   = useState(searchParams.get('type') || 'consolidated');
  const [data, setData]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [filters, setFilters]         = useState({
    dt_code: '', sub_code: '', std: '', medium: '', school_type: '',
    from_date: '', to_date: '', status: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await reportsApi.get(reportType, params);
      const d = res.data;
      if (reportType === 'label') setData(d?.labels ?? []);
      else setData(d?.records ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [reportType, filters]);

  useEffect(() => { load(); }, [load]);

  function handlePrint() { window.print(); }

  const setFilter = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ dt_code: '', sub_code: '', std: '', medium: '', school_type: '', from_date: '', to_date: '', status: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-ink-500 mt-0.5">{data.length} records</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={load} disabled={loading} className="btn-secondary btn">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handlePrint} className="btn-primary btn">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        {REPORT_TYPES.map(rt => (
          <button key={rt.id} onClick={() => setReportType(rt.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
              reportType === rt.id
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-ink-100 bg-white hover:border-ink-200'}`}>
            <p className={`font-semibold text-sm ${reportType === rt.id ? 'text-brand-700' : 'text-ink-800'}`}>
              {rt.label}
            </p>
            <p className="text-xs text-ink-400 mt-0.5 leading-snug">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3 no-print">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1.5">
          <Filter size={12} /> Filters
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="form-label">DT Code</label>
            <input className="form-input" value={filters.dt_code} onChange={e => setFilter('dt_code', e.target.value.toUpperCase())} placeholder="ARL" />
          </div>
          <div>
            <label className="form-label">Subject</label>
            <input className="form-input" value={filters.sub_code} onChange={e => setFilter('sub_code', e.target.value.toUpperCase())} placeholder="MAT" />
          </div>
          <div>
            <label className="form-label">Standard</label>
            <select className="form-select" value={filters.std} onChange={e => setFilter('std', e.target.value)}>
              <option value="">All</option>
              {STANDARDS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Medium</label>
            <select className="form-select" value={filters.medium} onChange={e => setFilter('medium', e.target.value)}>
              <option value="">All</option>
              {MEDIUMS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">School Type</label>
            <select className="form-select" value={filters.school_type} onChange={e => setFilter('school_type', e.target.value)}>
              <option value="">All</option>
              {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          {(reportType === 'dispatch') && (
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">All</option>
                <option>Dispatched</option><option>Delivered</option><option>Returned</option>
              </select>
            </div>
          )}
          {['dispatch'].includes(reportType) && (
            <>
              <div>
                <label className="form-label">From Date</label>
                <input type="date" className="form-input" value={filters.from_date} onChange={e => setFilter('from_date', e.target.value)} />
              </div>
              <div>
                <label className="form-label">To Date</label>
                <input type="date" className="form-input" value={filters.to_date} onChange={e => setFilter('to_date', e.target.value)} />
              </div>
            </>
          )}
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost btn btn-sm">
            <X size={13} /> Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="card p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={FileText} title="No data found" description="Try adjusting your filters" />
      ) : reportType === 'label' ? (
        // Label grid
        <div className="print:p-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            {data.map((label: any) => <LabelCard key={label.id} label={label} />)}
          </div>
        </div>
      ) : reportType === 'consolidated' ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Teacher</th><th>Contact</th><th>DT/Sub</th>
                  <th>Std/Med</th><th>School</th><th>Total Dispatches</th>
                  <th>Last Dispatch</th><th>Followup Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.id}>
                    <td className="text-ink-400 text-xs font-mono">{r.sno}</td>
                    <td>
                      <p className="font-medium text-sm">{r.teacher_name}</p>
                      <p className="text-xs text-ink-400 font-mono">{r.barcode}</p>
                    </td>
                    <td className="text-sm">{r.contact_number}</td>
                    <td><div className="flex gap-1 flex-wrap">
                      {r.dt_code && <span className="badge bg-ink-100 text-ink-600 text-xs">{r.dt_code}</span>}
                      {r.sub_code && <span className="badge bg-brand-100 text-brand-700 text-xs">{r.sub_code}</span>}
                    </div></td>
                    <td><div className="flex gap-1 flex-wrap">
                      {r.std && <span className="badge bg-amber-100 text-amber-700 text-xs">Std {r.std}</span>}
                      {r.medium && <span className="badge bg-ink-100 text-ink-600 text-xs">{r.medium}</span>}
                    </div></td>
                    <td className="max-w-[150px]"><p className="text-xs text-ink-700 truncate">{r.school_name}</p></td>
                    <td className="text-center font-semibold text-sm">{r.total_dispatches ?? 0}</td>
                    <td className="text-sm text-ink-600 whitespace-nowrap">{formatDate(r.last_dispatch_date)}</td>
                    <td>
                      {r.latest_followup_status
                        ? <span className={`badge text-xs ${
                            r.latest_followup_status === 'Pending'   ? 'bg-amber-100 text-amber-700' :
                            r.latest_followup_status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                            r.latest_followup_status === 'Informed'  ? 'bg-brand-100 text-brand-700' :
                            'bg-ink-100 text-ink-500'}`}>
                            {r.latest_followup_status} (L{r.latest_followup_level})
                          </span>
                        : <span className="text-ink-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : reportType === 'dispatch' ? (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Teacher</th><th>Barcode</th><th>Dispatch Date</th><th>POD Date</th><th>Status</th><th>Latest Followup</th></tr>
              </thead>
              <tbody>
                {data.map((r: any) => (
                  <tr key={r.dispatch_id}>
                    <td>
                      <p className="font-medium text-sm">{r.teacher_name}</p>
                      <p className="text-xs text-ink-400">{r.school_name}</p>
                    </td>
                    <td className="font-mono text-xs text-ink-500">{r.barcode}</td>
                    <td className="text-sm whitespace-nowrap">{formatDate(r.dispatch_date)}</td>
                    <td className="text-sm whitespace-nowrap">{r.pod_date ? formatDate(r.pod_date) : '—'}</td>
                    <td>
                      <span className={`badge text-xs ${
                        r.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'Returned'  ? 'bg-rose-100 text-rose-600' :
                        'bg-brand-100 text-brand-700'}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.latest_followup
                        ? <span className={`badge text-xs ${r.latest_followup === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.latest_followup}</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // School address
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4">
          {data.map((r: any) => (
            <div key={r.id} className="border border-ink-200 rounded-lg p-3">
              <p className="font-semibold text-sm text-ink-900">{r.school_name}</p>
              <p className="text-xs text-ink-500 mt-1 leading-snug">{r.full_address}</p>
              <p className="text-xs text-ink-500 mt-1">Ph: {r.contact_number}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="h-48 skeleton rounded-xl" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}
