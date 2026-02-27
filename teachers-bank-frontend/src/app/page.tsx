'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, Bell, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { teachersApi, dispatchApi, followupsApi } from '@/lib/api';
import { formatDate, today } from '@/lib/utils';

interface Stats {
  totalTeachers: number;
  todayDispatches: number;
  pendingFollowups: number;
  overdueFollowups: number;
  recentDispatches: any[];
  todayFollowups: any[];
}

function StatCard({ icon: Icon, label, value, color, href }: any) {
  return (
    <Link href={href} className="stat-card group hover:shadow-card-md transition-shadow duration-200">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-ink-900 tabular-nums">{value ?? '—'}</p>
        <p className="text-xs text-ink-500 font-medium mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [teachers, dispatches, pendingFups, overdueFups, recentDisp, todayFups] = await Promise.all([
          teachersApi.list({ limit: 1 }),
          dispatchApi.list({ date: today(), limit: 1 }),
          followupsApi.list({ status: 'Pending', limit: 1 }),
          followupsApi.list({ status: 'Pending', to_date: today(), limit: 5 }),
          dispatchApi.list({ limit: 5 }),
          followupsApi.list({ date: 'today', limit: 10 }),
        ]);
        setStats({
          totalTeachers:   teachers.data?.pagination?.total ?? 0,
          todayDispatches: dispatches.data?.pagination?.total ?? 0,
          pendingFollowups: pendingFups.data?.pagination?.total ?? 0,
          overdueFollowups: overdueFups.data?.pagination?.total ?? 0,
          recentDispatches: recentDisp.data?.dispatches ?? [],
          todayFollowups:   todayFups.data?.followups ?? [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { icon: Users,    label: 'Total Teachers',    value: stats?.totalTeachers,    color: 'bg-brand-600',   href: '/teachers' },
    { icon: Package,  label: "Today's Dispatches", value: stats?.todayDispatches,  color: 'bg-emerald-600', href: '/dispatch' },
    { icon: Bell,     label: 'Pending Follow-ups', value: stats?.pendingFollowups, color: 'bg-amber-500',   href: '/followups' },
    { icon: AlertCircle, label: 'Overdue Follow-ups', value: stats?.overdueFollowups, color: 'bg-rose-500', href: '/followups?status=Pending' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="card h-20 skeleton" />)
          : statCards.map(s => <StatCard key={s.label} {...s} />)
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Dispatches */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-800 flex items-center gap-2">
              <Package size={16} className="text-emerald-600" /> Recent Dispatches
            </h2>
            <Link href="/dispatch" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-10 skeleton" />)}</div>
          ) : stats?.recentDispatches.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-4">No dispatches yet</p>
          ) : (
            <div className="space-y-1">
              {stats?.recentDispatches.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{d.teacher_name}</p>
                    <p className="text-xs text-ink-400">{d.school_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
                      {d.status}
                    </span>
                    <p className="text-xs text-ink-400 mt-0.5">{formatDate(d.dispatch_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Followups */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-800 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" /> Today's Follow-ups
            </h2>
            <Link href="/followups?date=today" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-10 skeleton" />)}</div>
          ) : stats?.todayFollowups.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-ink-600">All clear for today!</p>
              <p className="text-xs text-ink-400">No follow-ups due today</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats?.todayFollowups.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{f.teacher_name}</p>
                    <p className="text-xs text-ink-400">{f.contact_number}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge bg-amber-100 text-amber-700">
                      Level {f.followup_level}
                    </span>
                    <p className="text-xs text-ink-400 mt-0.5">{f.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-ink-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/teachers?action=new" className="btn-primary btn">
            <Users size={15} /> Add Teacher
          </Link>
          <Link href="/dispatch" className="btn-success btn">
            <Package size={15} /> Scan &amp; Dispatch
          </Link>
          <Link href="/followups?date=today" className="btn btn-secondary">
            <Clock size={15} /> Today's Follow-ups
          </Link>
          <Link href="/reports?type=label" className="btn btn-secondary">
            <TrendingUp size={15} /> Print Labels
          </Link>
        </div>
      </div>
    </div>
  );
}
