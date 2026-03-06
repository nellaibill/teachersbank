'use client';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, RefreshCw, Filter, X, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { SCHOOL_TYPES, MEDIUMS, STANDARDS, DISTRICTS, SUBJECTS } from '@/lib/types';
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

    <p className="text-[13px] px-5 font-semibold leading-tight">{label.teacher_name || '-'}</p>
    <p className="mt-0.5 px-5 text-[10px] leading-snug whitespace-pre-line">{label.teacher_address || '-'}</p>
    <p className="mt-0.5 px-5 text-[10px]">{districtWithPin || '-'}</p>
    <p className="mt-0.5 px-5 text-[12px] font-semibold">Ph: {label.contact_number || '-'}</p>
  </div>

  {/* ✅ Subject box sticks to bottom */}
  <div className="border px-5 border-[#99a6b7] bg-[#e9edf2] px-2 py-0.5 text-[13px] font-semibold leading-5 text-[#1f3650] mt-auto">
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
  const labelSummaryRows = useMemo(() => {
    if (reportType !== 'label') return [];

    const splitCsv = (value: any) =>
      String(value || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

    const grouped = new Map<string, {
      district: string;
      districtCode: string;
      subject: string;
      medium: string;
      stdQty: Record<string, number>;
    }>();

    for (const row of data) {
      const districtCode = String(row.dt_code || '').trim();
      const district = DISTRICTS[districtCode] || districtCode || '-';
      const subjects = splitCsv(row.sub_code);
      const mediums = splitCsv(row.medium);
      const standards = splitCsv(row.std).filter((s: string) => STANDARDS.includes(s));

      const subjectList = subjects.length ? subjects : ['-'];
      const mediumList = mediums.length ? mediums : ['-'];

      for (const subject of subjectList) {
        for (const medium of mediumList) {
          const key = `${districtCode}|${subject}|${medium}`;

          if (!grouped.has(key)) {
            grouped.set(key, {
              district,
              districtCode: districtCode || '-',
              subject,
              medium,
              stdQty: STANDARDS.reduce((acc, std) => ({ ...acc, [std]: 0 }), {} as Record<string, number>),
            });
          }

          if (standards.length > 0) {
            const target = grouped.get(key)!;
            for (const std of standards) {
              target.stdQty[std] += 1;
            }
          }
        }
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.district !== b.district) return a.district.localeCompare(b.district);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.medium.localeCompare(b.medium);
    });
  }, [data, reportType]);

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
      <div className="card p-4 space-y-3 no-print">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1.5">
          <Filter size={12} /> Filters
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="form-label">District</label>
            <select className="form-select" value={filters.dt_code} onChange={e => setFilter('dt_code', e.target.value)}>
              <option value="">All</option>
              {Object.entries(DISTRICTS).sort((a,b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Subject</label>
            <select className="form-select" value={filters.sub_code} onChange={e => setFilter('sub_code', e.target.value)}>
              <option value="">All</option>
              {Object.entries(SUBJECTS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Standard</label>
            <select className="form-select" value={filters.std} onChange={e => setFilter('std', e.target.value)}>
              <option value="">All</option>
              {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Medium</label>
            <select className="form-select" value={filters.medium} onChange={e => setFilter('medium', e.target.value)}>
              <option value="">All</option>
              {Object.entries(MEDIUMS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">School Type</label>
            <select className="form-select" value={filters.school_type} onChange={e => setFilter('school_type', e.target.value)}>
              <option value="">All</option>
              {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
        // 3x3 label pages (9 records per printed page)
        <div className="print:p-0 space-y-4 print:space-y-0">
          <div className="space-y-4 print:space-y-0">
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

          {labelSummaryRows.length > 0 && (
            <div
              className="overflow-x-auto rounded-lg border-2 border-black bg-[#e9e9e9] print:rounded-none"
              style={{ pageBreakBefore: 'always' }}
            >
              <table className="w-full border-collapse text-center text-sm text-black">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border-2 border-black px-3 py-3 font-semibold whitespace-nowrap">Sl. No</th>
                    <th rowSpan={2} className="border-2 border-black px-4 py-3 font-semibold whitespace-nowrap">District</th>
                    <th rowSpan={2} className="border-2 border-black px-4 py-3 font-semibold whitespace-nowrap">Subject</th>
                    <th rowSpan={2} className="border-2 border-black px-4 py-3 font-semibold whitespace-nowrap">Medium</th>
                    <th colSpan={STANDARDS.length} className="border-2 border-black px-4 py-3 font-semibold">
                      Required Books Quantity Standard Wise
                    </th>
                  </tr>
                  <tr>
                    {STANDARDS.map(std => (
                      <th key={std} className="border-2 border-black px-4 py-3 font-semibold">{std}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labelSummaryRows.map((row, idx) => (
                    <tr key={`${row.districtCode}-${row.subject}-${row.medium}`}>
                      <td className="border-2 border-black px-3 py-3">{idx + 1}</td>
                      <td className="border-2 border-black px-4 py-3 text-left">{row.district}</td>
                      <td className="border-2 border-black px-4 py-3">{SUBJECTS[row.subject] || row.subject}</td>
                      <td className="border-2 border-black px-4 py-3">{row.medium}</td>
                      {STANDARDS.map(std => (
                        <td key={std} className="border-2 border-black px-4 py-3">
                          {row.stdQty[std] > 0 ? row.stdQty[std] : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
