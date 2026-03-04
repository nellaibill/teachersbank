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
import toast from 'react-hot-toast';

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
            <p><strong>Follow-up reminder:</strong> {formatDate(result.data.reminder_date)}</p>
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
  const [pod_date, setPodDate] = useState(dispatch.pod_date || '');
  const [status, setStatus]   = useState(dispatch.status);
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await dispatchApi.update(dispatch.id, { pod_date: pod_date || undefined, status });
      toast.success('Dispatch updated');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>

    </div>
  );
}

export default function DispatchPage() {
  const [barcode, setBarcode]           = useState('');
  const [dispatchDate, setDispatchDate] = useState(today());
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState<any>(null);
  const [dispatches, setDispatches]     = useState<Dispatch[]>([]);
  const [pagination, setPagination]     = useState<PaginationType | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [filterDate, setFilterDate]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updateTarget, setUpdateTarget] = useState<Dispatch | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterDate)   params.date   = filterDate;
      if (filterStatus) params.status = filterStatus;
      const res = await dispatchApi.list(params);
      setDispatches(res.data?.dispatches ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, filterDate, filterStatus]);

  useEffect(() => { loadDispatches(); }, [loadDispatches]);

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

      {updateTarget && (
        <UpdateDispatchModal dispatch={updateTarget}
          onClose={() => setUpdateTarget(null)} onSaved={loadDispatches} />
      )}
    </div>
  );
}
