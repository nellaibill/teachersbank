'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Users, Phone, CheckCircle2, Clock, XCircle, AlertCircle,
  CalendarDays, Loader2, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Shield,
} from 'lucide-react';
import { followupsApi } from '@/lib/api';
import { FollowupAdminDashboard } from '@/lib/types';
import { formatDate, today } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_COLORS: Record<string, string> = {
  Completed:   'text-emerald-700 bg-emerald-50',
  Processing:  'text-amber-700 bg-amber-50',
  Informed:    'text-amber-700 bg-amber-50',
  Pending:     'text-blue-700 bg-blue-50',
  'No Answer': 'text-red-700 bg-red-50',
};

const ALL_STATUSES = ['Completed', 'Processing', 'Informed', 'Pending', 'No Answer'];

function StatusPill({ label, count }: { label: string; count: number }) {
  if (!count) return null;
  const cls = STATUS_COLORS[label] ?? 'text-ink-600 bg-ink-50';
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {label} <span className="font-bold">{count}</span>
    </span>
  );
}

function OverallCard({
  label, value, icon: Icon, colorCls,
}: { label: string; value: number; icon: React.ElementType; colorCls: string }) {
  return (
    <div className="bg-white rounded-xl border border-ink-200 p-4 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-ink-50`}>
        <Icon size={18} className={colorCls} />
      </div>
      <div>
        <p className="text-xl font-bold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

type SortKey = 'name' | 'total' | string;

function UserRow({ userData }: { userData: FollowupAdminDashboard['users'][number] }) {
  const [open, setOpen] = useState(false);
  const { name, total, by_status, daily } = userData;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <tr
        className="border-b border-ink-100 hover:bg-ink-50 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            <span className="text-sm font-medium text-ink-800">{name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-sm font-bold text-ink-900">{total}</span>
        </td>
        {ALL_STATUSES.map(s => (
          <td key={s} className="px-4 py-3 text-center">
            <span className={`text-sm font-medium ${(by_status[s] ?? 0) > 0 ? 'text-ink-800' : 'text-ink-300'}`}>
              {by_status[s] ?? 0}
            </span>
          </td>
        ))}
        <td className="px-4 py-3 text-center">
          {open ? <ChevronUp size={14} className="text-ink-400 mx-auto" /> : <ChevronDown size={14} className="text-ink-400 mx-auto" />}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-ink-100 bg-ink-50/50">
          <td colSpan={7} className="px-6 py-3">
            <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-2">
              Daily Breakdown
            </p>
            {daily.length === 0 ? (
              <p className="text-xs text-ink-400">No daily data</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-ink-400">
                      <th className="text-left pb-1 pr-4">Date</th>
                      <th className="text-right pb-1 pr-3">Total</th>
                      {ALL_STATUSES.map(s => (
                        <th key={s} className="text-right pb-1 pr-3">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...daily].reverse().map(d => (
                      <tr key={d.date} className="border-t border-ink-100">
                        <td className="pr-4 py-1 text-ink-600">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="text-right pr-3 font-bold text-ink-800">{d.total}</td>
                        {ALL_STATUSES.map(s => (
                          <td key={s} className={`text-right pr-3 ${(d.by_status[s] ?? 0) > 0 ? 'text-ink-700' : 'text-ink-300'}`}>
                            {d.by_status[s] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminFollowupDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data,     setData]    = useState<FollowupAdminDashboard | null>(null);
  const [loading,  setLoading] = useState(true);
  const [fromDate, setFrom]    = useState(monthStart());
  const [toDate,   setTo]      = useState(today());
  const [sortKey,  setSort]    = useState<SortKey>('total');
  const [sortAsc,  setSortAsc] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/');
  }, [authLoading, isAdmin, router]);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await followupsApi.dashboard({ admin: 1, from_date: fromDate, to_date: toDate });
      setData(res.data as FollowupAdminDashboard);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  const overall  = data?.overall;
  const users    = data?.users ?? [];

  // Sort users
  const sorted = [...users].sort((a, b) => {
    let diff = 0;
    if (sortKey === 'name')   diff = a.name.localeCompare(b.name);
    else if (sortKey === 'total') diff = a.total - b.total;
    else diff = (a.by_status[sortKey] ?? 0) - (b.by_status[sortKey] ?? 0);
    return sortAsc ? diff : -diff;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSort(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-ink-300">↕</span>;
    return sortAsc ? <span className="text-brand-500">↑</span> : <span className="text-brand-500">↓</span>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-900">Follow-up Analytics</h1>
            <p className="text-xs text-ink-400">All users — admin view</p>
          </div>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-ink-200 rounded-lg px-3 py-1.5 text-xs">
            <CalendarDays size={13} className="text-ink-400" />
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => setFrom(e.target.value)}
              className="outline-none bg-transparent text-ink-700"
            />
            <span className="text-ink-400">→</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today()}
              onChange={e => setTo(e.target.value)}
              className="outline-none bg-transparent text-ink-700"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Overall summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <OverallCard label="Total Calls" value={overall?.total ?? 0} icon={Phone} colorCls="text-brand-600" />
            <OverallCard label="Completed"   value={overall?.by_status['Completed'] ?? 0}  icon={CheckCircle2} colorCls="text-emerald-600" />
            <OverallCard label="Processing"  value={(overall?.by_status['Processing'] ?? 0) + (overall?.by_status['Informed'] ?? 0)} icon={Clock}       colorCls="text-amber-600" />
            <OverallCard label="Pending"     value={overall?.by_status['Pending'] ?? 0}    icon={AlertCircle}  colorCls="text-blue-600" />
            <OverallCard label="No Answer"   value={overall?.by_status['No Answer'] ?? 0}  icon={XCircle}      colorCls="text-red-600" />
            <OverallCard label="Active Users" value={users.length}                          icon={Users}        colorCls="text-ink-600" />
          </div>

          {/* Per-user table */}
          <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-2">
              <Users size={15} className="text-ink-400" />
              <h2 className="text-sm font-semibold text-ink-800">Per-User Breakdown</h2>
              <span className="ml-auto text-xs text-ink-400">{users.length} user{users.length !== 1 ? 's' : ''}</span>
            </div>
            {sorted.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingUp size={36} className="text-ink-200 mx-auto mb-3" />
                <p className="text-ink-400 text-sm">No follow-up activity in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-ink-50 text-xs text-ink-500 uppercase tracking-wider">
                    <tr>
                      <th
                        className="text-left px-4 py-2.5 cursor-pointer hover:text-ink-800"
                        onClick={() => toggleSort('name')}
                      >
                        User <SortIcon k="name" />
                      </th>
                      <th
                        className="px-4 py-2.5 text-center cursor-pointer hover:text-ink-800"
                        onClick={() => toggleSort('total')}
                      >
                        Total <SortIcon k="total" />
                      </th>
                      {ALL_STATUSES.map(s => (
                        <th
                          key={s}
                          className="px-4 py-2.5 text-center cursor-pointer hover:text-ink-800 whitespace-nowrap"
                          onClick={() => toggleSort(s)}
                        >
                          {s} <SortIcon k={s} />
                        </th>
                      ))}
                      <th className="px-4 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(u => (
                      <UserRow key={u.name} userData={u} />
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot className="bg-ink-50 text-xs font-semibold border-t border-ink-200">
                    <tr>
                      <td className="px-4 py-2.5 text-ink-700">Grand Total</td>
                      <td className="px-4 py-2.5 text-center text-ink-900">{overall?.total ?? 0}</td>
                      {ALL_STATUSES.map(s => (
                        <td key={s} className="px-4 py-2.5 text-center text-ink-700">
                          {overall?.by_status[s] ?? 0}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
