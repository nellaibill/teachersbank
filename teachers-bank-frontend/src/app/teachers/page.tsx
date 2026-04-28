'use client';
import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Filter, Edit2, Trash2, Eye, Phone, X, RefreshCw, Users, Upload, Loader2, AlertCircle } from 'lucide-react';
import { teachersApi } from '@/lib/api';
import { Teacher, Pagination as PaginationType, DISTRICTS, SUBJECTS, MEDIUMS, STANDARDS, SCHOOL_TYPES } from '@/lib/types';
import { getTeacherClassifications } from '@/lib/teacherClassifications';
import TeacherFormModal from '@/components/teachers/TeacherFormModal';
import TeacherDetailModal from '@/components/teachers/TeacherDetailModal';
import DuplicatesModal from '@/components/teachers/DuplicatesModal';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const IMPORT_FIELDS = [
  'id',
  'teacher_name',
  'contact_number',
  'teacher_address',
  'pincode',
  'dt_code',
  'sub_code',
  'std',
  'medium',
  'classifications',
  'school_name',
  'school_type',
  'remarks',
  'barcode',
  'isActive',
  'created_at',
  'updated_at',
];

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cols.push(cell.trim());
      cell = '';
      continue;
    }

    cell += ch;
  }

  cols.push(cell.trim());
  return cols;
}

function parseTeacherCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  if (nonEmptyLines.length === 0) return [];

  const firstCols = parseCsvLine(nonEmptyLines[0]).map(col => col.replace(/^\uFEFF/, '').trim());
  const normalizedFirstCols = firstCols.map(col => col.toLowerCase());
  const hasHeader = normalizedFirstCols.includes('teacher_name') || normalizedFirstCols.includes('contact_number');

  const header = hasHeader ? normalizedFirstCols : IMPORT_FIELDS;
  const dataLines = hasHeader ? nonEmptyLines.slice(1) : nonEmptyLines;

  const rows: Record<string, string>[] = [];

  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};

    for (let i = 0; i < header.length; i += 1) {
      row[header[i]] = (cols[i] ?? '').trim();
    }

    const values = Object.values(row).map(value => value.trim());
    if (values.every(value => value === '')) continue;

    rows.push(row);
  }

  return rows;
}

function TeachersContent() {
  const searchParams = useSearchParams();
  const { isAdmin, isManager } = useAuth();

  const [teachers,    setTeachers]    = useState<Teacher[]>([]);
  const [pagination,  setPagination]  = useState<PaginationType | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(20);
  const [search,      setSearch]      = useState('');
  const [filters, setFilters] = useState({
    dt_code: '', sub_code: '', std: '', medium: '', school_type: '', isActive: '1'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
  const [importing, setImporting] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [totalDuplicateTeachers, setTotalDuplicateTeachers] = useState(0);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'new') setShowForm(true);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, ...filters };
      if (search.trim()) params.search = search.trim();
      const res = await teachersApi.list(params);
      setTeachers(res.data?.teachers ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load teachers');
    } finally { setLoading(false); }
  }, [page, limit, search, filters]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(t: Teacher) {
    if (!confirm(`Deactivate ${t.teacher_name}?`)) return;
    try {
      await teachersApi.delete(t.id);
      toast.success('Teacher deactivated');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCheckDuplicates() {
    setLoadingDuplicates(true);
    try {
      const res = await teachersApi.duplicates();
      const duplicateGroups = res.data?.duplicates ?? [];
      setDuplicates(duplicateGroups);
      
      // Calculate total duplicate teachers
      const total = duplicateGroups.reduce((sum: number, group: any) => sum + group.count, 0);
      setTotalDuplicateTeachers(total);
      
      if (duplicateGroups.length === 0) {
        toast.success('No duplicate records found!');
      } else {
        setShowDuplicates(true);
        toast.success(`Found ${duplicateGroups.length} duplicate groups`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to check duplicates');
    } finally {
      setLoadingDuplicates(false);
    }
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseTeacherCsv(text);

      if (rows.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }

      const res = await teachersApi.import(rows);
      const summary = res.data || {};
      const created = Number(summary.created || 0);
      const updated = Number(summary.updated || 0);
      const errors = Array.isArray(summary.errors) ? summary.errors : [];

      if (errors.length > 0) {
        const firstError = errors[0]?.message || 'Some rows failed to import';
        toast.error(`Import completed with errors. Created: ${created}, Updated: ${updated}, Errors: ${errors.length}. ${firstError}`);
      } else {
        toast.success(`Import completed. Created: ${created}, Updated: ${updated}`);
      }

      await load();
    } catch (error: any) {
      toast.error(error.message || 'CSV import failed');
    } finally {
      setImporting(false);
    }
  }

  const activeFilters = Object.entries(filters)
    .filter(([k, v]) => v && !(k === 'isActive' && v === '1')).length;

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
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFileChange}
          />
          {isAdmin && (
            <>
              <button
                onClick={() => importFileRef.current?.click()}
                className="btn-secondary btn"
                disabled={importing}
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import CSV
              </button>
              <button 
                onClick={handleCheckDuplicates}
                className="btn-secondary btn"
                disabled={loadingDuplicates}
              >
                {loadingDuplicates ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                Check Duplicates
              </button>
              <button onClick={() => { setEditTeacher(null); setShowForm(true); }} className="btn-primary btn">
                <Plus size={16} /> Add Teacher
              </button>
            </>
          )}
        </div>
      </div>

      {isManager && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Manager access is view-only. Teacher records can be viewed but not edited or deleted.
        </div>
      )}

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="form-input"
              placeholder="Search by name, phone, school, address…"
            />
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
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'} relative`}
          >
            <Filter size={15} /> Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button onClick={load} className="btn-secondary btn btn-icon">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {showFilters && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="form-label">District</label>
              <select
                className="form-select"
                value={filters.dt_code}
                onChange={e => { setFilters(f => ({ ...f, dt_code: e.target.value })); setPage(1); }}
              >
                <option value="">All</option>
                {Object.entries(DISTRICTS).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                value={filters.sub_code}
                onChange={e => { setFilters(f => ({ ...f, sub_code: e.target.value })); setPage(1); }}
              >
                <option value="">All</option>
                {Object.entries(SUBJECTS).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Standard</label>
              <select
                className="form-select"
                value={filters.std}
                onChange={e => { setFilters(f => ({ ...f, std: e.target.value })); setPage(1); }}
              >
                <option value="">All</option>
                {STANDARDS.map(s => <option key={s} value={s}>Std {s}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Medium</label>
              <select
                className="form-select"
                value={filters.medium}
                onChange={e => { setFilters(f => ({ ...f, medium: e.target.value })); setPage(1); }}
              >
                <option value="">All</option>
                <option value="TM">Tamil Medium</option>
                <option value="EM">English Medium</option>
              </select>
            </div>

            <div>
              <label className="form-label">School Type</label>
              <select
                className="form-select"
                value={filters.school_type}
                onChange={e => { setFilters(f => ({ ...f, school_type: e.target.value })); setPage(1); }}
              >
                <option value="">All</option>
                {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.isActive}
                onChange={e => { setFilters(f => ({ ...f, isActive: e.target.value })); setPage(1); }}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
                <option value="">All</option>
              </select>
            </div>

            {activeFilters > 0 && (
              <div className="flex items-end xl:col-span-6">
                <button
                  onClick={() => { setFilters({ dt_code: '', sub_code: '', std: '', medium: '', school_type: '', isActive: '1' }); setPage(1); }}
                  className="btn-ghost btn btn-sm"
                >
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
            description={isAdmin ? 'Try adjusting your filters or add a new teacher' : 'Try adjusting your filters'}
            action={isAdmin ? <button onClick={() => setShowForm(true)} className="btn-primary btn"><Plus size={15} />Add Teacher</button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Teacher</th>
                  <th>Contact</th>
                  <th>District</th>
                  <th>Subjects</th>
                  <th>Std / Medium</th>
                  <th>School</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t, idx) => {
                  const classifications = getTeacherClassifications(t);
                  return (
                  <tr key={t.id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                    <td className="text-ink-400 font-mono text-xs w-10">{(page - 1) * (pagination?.limit || limit) + idx + 1}</td>
                    <td>
                      <p className="font-medium text-ink-900">{t.teacher_name}</p>
                      <p className="text-[11px] text-ink-400 font-mono mt-0.5">{t.barcode}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm text-ink-700">
                        <Phone size={12} className="text-ink-400 flex-shrink-0" />
                        {t.contact_number}
                      </div>
                      {t.pincode && <p className="text-xs text-ink-400 mt-0.5">📮 {t.pincode}</p>}
                    </td>
                    <td>
                      {t.dt_code
                        ? <span className="badge bg-ink-100 text-ink-700">{DISTRICTS[t.dt_code] || t.dt_code}</span>
                        : '—'}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {classifications.flatMap((entry, rowIndex) =>
                          entry.subjects.map(subject => (
                            <span key={`${rowIndex}-${entry.std}-${entry.medium}-${subject}`} className="badge bg-brand-100 text-brand-700 text-[10px]">
                              {SUBJECTS[subject] || subject}
                              <span className="ml-1 opacity-70">Std {entry.std}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {classifications.map((entry, rowIndex) => (
                          <div key={`${entry.std}-${entry.medium}-${rowIndex}`} className="flex flex-wrap gap-1">
                            <span className="badge bg-amber-100 text-amber-700 text-[10px]">Std {entry.std}</span>
                            <span className="badge bg-ink-100 text-ink-600 text-[10px]">{MEDIUMS[entry.medium] || entry.medium}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-[160px]">
                      <p className="text-sm text-ink-700 truncate">{t.school_name || '—'}</p>
                      {t.school_type && <p className="text-[11px] text-ink-400">{t.school_type}</p>}
                    </td>
                    <td>
                      <span className={`badge ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewTeacher(t)} className="btn-ghost btn btn-icon btn-sm text-ink-500"><Eye size={15}/></button>
                        {isAdmin ? (
                          <>
                            <button onClick={() => { setEditTeacher(t); setShowForm(true); }} className="btn-ghost btn btn-icon btn-sm text-brand-600"><Edit2 size={15}/></button>
                            <button onClick={() => handleDelete(t)} className="btn-ghost btn btn-icon btn-sm text-rose-500"><Trash2 size={15}/></button>
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">View only</span>
                        )}
                      </div>
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
              total={pagination.total} limit={pagination.limit}
              onChange={p => { setPage(p); window.scrollTo(0, 0); }} />
          </div>
        )}
      </div>

      {showForm && (
        <TeacherFormModal teacher={editTeacher}
          onClose={() => { setShowForm(false); setEditTeacher(null); }}
          onSaved={load} />
      )}
      {viewTeacher && (
        <TeacherDetailModal teacher={viewTeacher}
          onClose={() => setViewTeacher(null)}
          canEdit={isAdmin}
          onEdit={t => { setViewTeacher(null); setEditTeacher(t); setShowForm(true); }} />
      )}
      <DuplicatesModal
        isOpen={showDuplicates}
        duplicates={duplicates}
        totalGroups={duplicates.length}
        totalDuplicateTeachers={totalDuplicateTeachers}
        onClose={() => setShowDuplicates(false)}
        onSelectTeacher={(teacher) => {
          setViewTeacher(teacher);
        }}
      />
    </div>
  );
}

export default function TeachersPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-3">{Array(5).fill(0).map((_,i) => <div key={i} className="h-12 skeleton"/>)}</div>}>
      <TeachersContent />
    </Suspense>
  );
}
