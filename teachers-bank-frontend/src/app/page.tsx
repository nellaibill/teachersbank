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


      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-ink-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/teachers?action=new" className="btn-primary btn">
            <Users size={15} /> Add Teacher
          </Link>
         
          <Link href="/reports?type=label" className="btn btn-secondary">
            <TrendingUp size={15} /> Print Labels
          </Link>
        </div>
      </div>
    </div>
  );
}
