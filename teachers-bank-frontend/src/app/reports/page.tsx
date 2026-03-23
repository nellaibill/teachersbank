'use client';
import { Fragment, useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, RefreshCw, Filter, X, FileText } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { SCHOOL_TYPES, MEDIUMS, STANDARDS, DISTRICTS, SUBJECTS, SUBJECT_STANDARD_MAP } from '@/lib/types';
import { getTeacherClassifications } from '@/lib/teacherClassifications';
import { formatDate } from '@/lib/utils';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'consolidated', label: 'Consolidated', desc: 'All teachers with dispatch & followup summary' },
  { id: 'label', label: 'Mailing Labels', desc: 'Print-ready address labels with barcodes' },
  { id: 'dispatch', label: 'Dispatch Report', desc: 'Dispatch history with filters' },
  { id: 'school_address', label: 'School Address', desc: 'School address labels for mailing' },
];

function getFollowupStatusLabel(status?: string) {
  return status === 'Informed' ? 'Processing' : (status || '-');
}

function ReportFilterHeader({ reportType, filters, total }: { reportType: string; filters: Record<string, string>; total: number }) {
  const reportName = REPORT_TYPES.find(report => report.id === reportType)?.label || 'Report';
  const summary = [
    { label: 'District', value: filters.dt_code ? (DISTRICTS[filters.dt_code] || filters.dt_code) : 'All' },
    { label: 'Subject', value: filters.sub_code ? (SUBJECTS[filters.sub_code] || filters.sub_code) : 'All' },
    { label: 'STD', value: filters.std ? `Std ${filters.std}` : 'All' },
    { label: 'Medium', value: filters.medium ? (MEDIUMS[filters.medium] || filters.medium) : 'All' },
    { label: 'School Type', value: filters.school_type || 'All' },
  ];

  return (
    <div className="rounded-xl border border-ink-200 bg-white px-4 py-3 print:rounded-none print:border-black print:px-3 print:py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm print:flex-nowrap print:gap-x-2 print:gap-y-0">
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <h2 className="text-base font-semibold text-ink-900">{reportName}</h2>
          <p className="text-xs text-ink-500">Generated on {new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <p className="text-sm font-medium whitespace-nowrap text-ink-600">Total Records: {total}</p>
        {summary.map(item => (
          <div key={item.label} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs leading-none print:bg-transparent print:px-1.5">
            <span className="font-semibold uppercase tracking-wide text-ink-500">{item.label}:</span>
            <span className="whitespace-nowrap text-ink-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelCard({ label, serialNo }: { label: any; serialNo: number }) {
  const districtWithPin = ['', label.pincode].filter(Boolean).join(' - ');
  const classificationValue = String(label.classification_map || label.classifications || '').trim();

  return (
    <div
      className="relative rounded-lg border border-[#aeb9c8] bg-[#e7edf4] p-1 text-left text-[#23394f] min-h-[170px] print:rounded-none print:border-black flex flex-col justify-between"
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
    >
      <div className="flex-1">
        <p className="absolute right-2 top-1 text-sm font-semibold text-[#1d3146]">{serialNo}</p>

        {label.barcode && (
          <div className="mb-2 mx-auto w-fit bg-[#f2f2f1] px-2 pt-1.5 pb-1 flex items-center justify-center">
            <BarcodeDisplay value={label.barcode} height={25} fontSize={10} width={1.5} />
          </div>
        )}

        <p className="text-[13px] px-5 font-semibold leading-tight">{label.teacher_name || '-'}</p>
        <p className="mt-0.5 px-5 text-[10px] leading-snug whitespace-pre-line">{label.teacher_address || '-'} - {districtWithPin}</p>
        <p className="mt-0.5 px-5 text-[12px] font-semibold">Ph: {label.contact_number || '-'}</p>
      </div>

      <div className="border px-5 border-[#99a6b7] bg-[#e9edf2] py-0.5 text-[13px] font-semibold leading-5 text-[#1f3650] mt-auto">
        <div className="whitespace-pre-line break-all">{classificationValue || '-'}</div>
      </div>
    </div>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const [reportType, setReportType] = useState(searchParams.get('type') || 'consolidated');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
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
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
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
      const classifications = getTeacherClassifications(row);

      for (const entry of classifications) {
        for (const subject of entry.subjects) {
          const allowedStandards = new Set(SUBJECT_STANDARD_MAP[subject] || STANDARDS);
          if (!allowedStandards.has(entry.std)) continue;

          const key = `${districtCode}|${subject}|${entry.medium}`;

          if (!grouped.has(key)) {
            grouped.set(key, {
              district,
              districtCode: districtCode || '-',
              subject,
              medium: entry.medium,
              stdQty: STANDARDS.reduce((acc, std) => ({ ...acc, [std]: 0 }), {} as Record<string, number>),
            });
          }

          const target = grouped.get(key)!;
          target.stdQty[entry.std] += 1;
        }
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.district !== b.district) return a.district.localeCompare(b.district);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.medium.localeCompare(b.medium);
    });
  }, [data, reportType]);

  const labelNotesRows = useMemo(() => {
    if (reportType !== 'label') return [];

    return data
      .filter((row: any) => String(row.remarks || '').trim())
      .map((row: any) => ({
        id: row.id,
        teacher_name: row.teacher_name || '-',
        remarks: String(row.remarks || '').trim(),
      }));
  }, [data, reportType]);

  return (
    <div className="space-y-5 max-w-7xl">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10px 8mm 8mm 8mm;
          }

          .dispatch-report-table tbody {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .dispatch-history-grid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .dispatch-history-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .school-address-grid {
            align-items: start;
          }

          .school-address-card {
            break-inside: avoid;
            page-break-inside: avoid;
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.id}
            onClick={() => setReportType(rt.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all duration-150 ${
              reportType === rt.id
                ? 'border-brand-500 bg-brand-50 shadow-sm'
                : 'border-ink-100 bg-white hover:border-ink-200'
            }`}
          >
            <p className={`font-semibold text-sm ${reportType === rt.id ? 'text-brand-700' : 'text-ink-800'}`}>
              {rt.label}
            </p>
            <p className="text-xs text-ink-400 mt-0.5 leading-snug">{rt.desc}</p>
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3 no-print">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex items-center gap-1.5">
          <Filter size={12} /> Filters
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="form-label">District</label>
            <select className="form-select" value={filters.dt_code} onChange={e => setFilter('dt_code', e.target.value)}>
              <option value="">All</option>
              {Object.entries(DISTRICTS).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
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
          {reportType === 'dispatch' && (
            <div>
              <label className="form-label">Status</label>
              <select className="form-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">All</option>
                <option>Dispatched</option>
                <option>Delivered</option>
                <option>Returned</option>
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

      {loading ? (
        <div className="card p-8 space-y-3">{Array(5).fill(0).map((_, i) => <div key={i} className="h-12 skeleton" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={FileText} title="No data found" description="Try adjusting your filters" />
      ) : reportType === 'label' ? (
        <div className="print:p-0 space-y-4 print:space-y-0">
          <ReportFilterHeader reportType={reportType} filters={filters} total={data.length} />
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
                      <td className="border-2 border-black px-4 py-3">{MEDIUMS[row.medium] || row.medium}</td>
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

          {labelNotesRows.length > 0 && (
            <div
              className="overflow-x-auto rounded-lg border-2 border-black bg-white print:rounded-none"
              style={{ pageBreakBefore: 'always' }}
            >
              <table className="w-full border-collapse text-sm text-black">
                <thead>
                  <tr>
                    <th className="border-2 border-black px-4 py-3 text-left font-semibold whitespace-nowrap">Teacher Name</th>
                    <th className="border-2 border-black px-4 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {labelNotesRows.map(row => (
                    <tr key={row.id}>
                      <td className="border-2 border-black px-4 py-3 align-top font-medium">{row.teacher_name}</td>
                      <td className="border-2 border-black px-4 py-3 align-top whitespace-pre-line">{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : reportType === 'consolidated' ? (
        <div className="space-y-4">
          <ReportFilterHeader reportType={reportType} filters={filters} total={data.length} />
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
                              r.latest_followup_status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                              r.latest_followup_status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                              ['Informed', 'Processing'].includes(r.latest_followup_status) ? 'bg-brand-100 text-brand-700' :
                              'bg-ink-100 text-ink-500'
                            }`}>
                              {getFollowupStatusLabel(r.latest_followup_status)}
                            </span>
                          : <span className="text-ink-300 text-xs">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'dispatch' ? (
        <div className="space-y-4">
          <ReportFilterHeader reportType={reportType} filters={filters} total={data.length} />
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table dispatch-report-table">
                <thead>
                  <tr><th>Teacher</th><th>Barcode</th><th>Dispatch Date</th><th>POD Date</th><th>Status</th><th>Latest Followup</th></tr>
                </thead>
                {data.map((r: any) => (
                  <tbody key={r.dispatch_id}>
                    <Fragment>
                      <tr>
                        <td>
                          <p className="font-medium text-sm">{r.teacher_name}</p>
                          <p className="text-xs text-ink-400">{r.school_name}</p>
                        </td>
                        <td className="font-mono text-xs text-ink-500">{r.barcode}</td>
                        <td className="text-sm whitespace-nowrap">{formatDate(r.dispatch_date)}</td>
                        <td className="text-sm whitespace-nowrap">{r.pod_date ? formatDate(r.pod_date) : '-'}</td>
                        <td>
                          <span className={`badge text-xs ${
                            r.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'Returned' ? 'bg-rose-100 text-rose-600' :
                            'bg-brand-100 text-brand-700'
                          }`}>{r.status}</span>
                        </td>
                        <td>
                          {r.latest_followup
                            ? <span className={`badge text-xs ${
                                r.latest_followup === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                ['Informed', 'Processing'].includes(r.latest_followup) ? 'bg-brand-100 text-brand-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>{getFollowupStatusLabel(r.latest_followup)}</span>
                            : '-'}
                        </td>
                      </tr>
                      {r.followup_history && r.followup_history.length > 0 && (
                        <tr className="bg-ink-50/60">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                                Follow-up Details
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 dispatch-history-grid">
                                {r.followup_history.map((history: any) => (
                                  <div key={history.id} className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs text-ink-500 dispatch-history-card">
                                    <p className="font-medium text-ink-800">{getFollowupStatusLabel(history.status)}</p>
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
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ReportFilterHeader reportType={reportType} filters={filters} total={data.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 school-address-grid">
            {data.map((r: any) => (
              <div key={r.id} className="border border-ink-200 rounded-lg p-3 school-address-card">
                <p className="font-semibold text-sm text-ink-900">{r.school_name}</p>
                <p className="text-xs text-ink-500 mt-1 whitespace-pre-line">{r.full_address || r.teacher_address || '-'}</p>
                <p className="text-xs text-ink-500 mt-1">Ph: {r.contact_number}</p>
              </div>
            ))}
          </div>
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
