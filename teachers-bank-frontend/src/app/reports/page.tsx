'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, RefreshCw, Filter, X, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { SCHOOL_TYPES, MEDIUMS, STANDARDS, DISTRICTS, SUBJECTS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'label',          label: 'Mailing Labels',  desc: 'Print-ready address labels with barcodes' },
  { id: 'school_address', label: 'School Address',  desc: 'School address labels for mailing' },
];

// ── Label card for printing ───────────────────────────────────────────────────
function LabelCard({ label, serialNo }: { label: any; serialNo: number }) {
  const districtName = label.dt_code ? (DISTRICTS[label.dt_code] || label.dt_code) : '';
  const districtWithPin = [districtName, label.pincode].filter(Boolean).join(' - ');
  const subjectLine = [label.dt_code, label.sub_code, label.std, label.medium]
    .map((v: string | undefined) => (v || '').trim())
    .filter(Boolean)
    .join('-');

  return (
<div className="relative rounded-lg border border-[#aeb9c8] bg-[#e7edf4] p-1 text-left text-[#23394f] min-h-[170px] print:rounded-none print:border-black flex flex-col justify-between"  // ✅ flex-col + justify-between
  style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
>
  <div className="flex-1">  {/* ✅ Content wrapper */}
    <p className="absolute right-2 top-1 text-sm font-semibold text-[#1d3146]">{serialNo}</p>

    {label.barcode && (
      <div className="mb-2 mx-auto w-fit bg-[#f2f2f1] px-2 pt-1.5 pb-1 flex items-center justify-center">
        <BarcodeDisplay value={label.barcode} height={25} fontSize={10} width={1.5} />
      </div>
    )}

    <p className="text-[13px] font-semibold leading-tight">{label.teacher_name || '-'}</p>
    <p className="mt-0.5 text-[10px] leading-snug whitespace-pre-line">{label.teacher_address || '-'}</p>
    <p className="mt-0.5 text-[10px]">{districtWithPin || '-'}</p>
    <p className="mt-0.5 text-[12px] font-semibold">Ph: {label.contact_number || '-'}</p>
  </div>

  {/* ✅ Subject box sticks to bottom */}
  <div className="border border-[#99a6b7] bg-[#e9edf2] px-2 py-0.5 text-[13px] font-semibold leading-5 text-[#1f3650] mt-auto">
    {subjectLine || '-'}
  </div>
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
  const labelPages = reportType === 'label'
    ? Array.from({ length: Math.ceil(data.length / 9) }, (_, i) => data.slice(i * 9, i * 9 + 9))
    : [];

  return (
    <div className="space-y-5 max-w-7xl">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10px 8mm 8mm 8mm;
          }
        }
      `}</style>
      <div className="flex items-start justify-between flex-wrap gap-3">

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
    
      {/* Results */}
      {loading ? (
        <div className="card p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={FileText} title="No data found" description="Try adjusting your filters" />
      ) : reportType === 'label' ? (
        // 3x3 label pages (9 records per printed page)
        <div className="print:p-0 space-y-4 print:space-y-0">
          {labelPages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2"
              style={{
                pageBreakAfter: pageIndex < labelPages.length - 1 ? 'always' : 'auto',
                paddingTop: '30px',
              }}
            >
              {page.map((label: any, itemIndex: number) => (
                <LabelCard
                  key={`${label.id}-${pageIndex}-${itemIndex}`}
                  label={label}
                  serialNo={pageIndex * 9 + itemIndex + 1}
                />
              ))}
            </div>
          ))}
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
              <p className="font-semibold text-sm text-ink-900 mt-1">Ph: {r.contact_number}</p>
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
