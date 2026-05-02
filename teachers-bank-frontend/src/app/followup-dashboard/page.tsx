'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Phone, CheckCircle2, Clock, XCircle, AlertCircle,
  BarChart2, CalendarDays, Loader2, RefreshCw, TrendingUp,
} from 'lucide-react';
import { followupsApi } from '@/lib/api';
import { FollowupUserDashboard, FOLLOWUP_STATUS_COLORS } from '@/lib/types';
import { formatDate, formatDateTime, today } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

// First day of current month
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  Completed:  { label: 'Completed',  icon: CheckCircle2,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  Processing: { label: 'Processing', icon: Clock,          color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  Informed:   { label: 'Informed',   icon: Clock,          color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  Pending:    { label: 'Pending',    icon: AlertCircle,    color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  'No Answer':{ label: 'No Answer',  icon: XCircle,        color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
};

const ALL_STATUSES = ['Completed', 'Processing', 'Informed', 'Pending', 'No Answer'];

function StatCard({
  label, value, icon: Icon, color, bg,
}: { label: string; value: number; icon: React.ElementType; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${bg}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white/60`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-900">{value}</p>
        <p className={`text-xs font-medium ${color}`}>{label}</p>
      </div>
    </div>
  );
}

function DailyBar({
  entry, max,
}: { entry: FollowupUserDashboard['daily'][number]; max: number }) {
  const pct = max > 0 ? Math.round((entry.total / max) * 100) : 0;
  return (
    <div className="group relative flex flex-col items-center gap-1">
      <span className="text-[10px] text-ink-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        {entry.total}
      </span>
      <div className="w-full bg-ink-100 rounded-full overflow-hidden" style={{ height: 80 }}>
        <div
          className="w-full bg-brand-500 rounded-full transition-all duration-300"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-[9px] text-ink-400 text-center leading-tight">
        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </span>
    </div>
  );
}

export default function FollowupDashboardPage() {
  const { user } = useAuth();
  const [data, setData]       = useState<FollowupUserDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFrom]   = useState(monthStart());
  const [toDate,   setTo]     = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await followupsApi.dashboard({ from_date: fromDate, to_date: toDate });
      setData(res.data as FollowupUserDashboard);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const summary    = data?.summary;
  const total      = summary?.total ?? 0;
  const byStatus   = summary?.by_status ?? {};
  const daily      = data?.daily ?? [];
  const recent     = data?.recent ?? [];
  const maxDaily   = daily.reduce((m, d) => Math.max(m, d.total), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-900">My Follow-up Activity</h1>
            <p className="text-xs text-ink-400">{user?.name}</p>
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
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
                <Phone size={20} className="text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink-900">{total}</p>
                <p className="text-xs font-medium text-brand-700">Total Calls</p>
              </div>
            </div>
            {ALL_STATUSES.map(s => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              return (
                <StatCard
                  key={s}
                  label={meta.label}
                  value={byStatus[s] ?? 0}
                  icon={Icon}
                  color={meta.color}
                  bg={meta.bg}
                />
              );
            })}
          </div>

          {/* Daily activity bar chart */}
          {daily.length > 0 && (
            <div className="bg-white rounded-xl border border-ink-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-ink-800">Daily Activity</h2>
                <span className="ml-auto text-xs text-ink-400">{daily.length} day{daily.length > 1 ? 's' : ''}</span>
              </div>
              <div
                className="grid gap-1.5 items-end"
                style={{ gridTemplateColumns: `repeat(${Math.min(daily.length, 31)}, minmax(0, 1fr))` }}
              >
                {daily.map(entry => (
                  <DailyBar key={entry.date} entry={entry} max={maxDaily} />
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {recent.length > 0 && (
            <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-ink-100 flex items-center gap-2">
                <Clock size={15} className="text-ink-400" />
                <h2 className="text-sm font-semibold text-ink-800">Recent Follow-ups</h2>
              </div>
              <div className="divide-y divide-ink-50">
                {recent.map(r => {
                  const meta = STATUS_META[r.status] ?? STATUS_META['Pending'];
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="px-5 py-3 flex items-start gap-3">
                      <Icon size={14} className={`mt-0.5 flex-shrink-0 ${meta.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">{r.teacher_name}</p>
                        <p className="text-xs text-ink-400">
                          {r.school_name} &bull; Level {r.followup_level} &bull; {formatDateTime(r.created_at)}
                        </p>
                        {r.remarks && (
                          <p className="text-xs text-ink-500 mt-0.5 italic">&ldquo;{r.remarks}&rdquo;</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} flex-shrink-0`}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Phone size={40} className="text-ink-200 mb-3" />
              <p className="text-ink-500 font-medium">No follow-up activity found</p>
              <p className="text-ink-400 text-sm mt-1">Adjust the date range above</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
