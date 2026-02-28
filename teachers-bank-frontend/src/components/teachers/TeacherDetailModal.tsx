'use client';
import { X, Edit2, Phone, MapPin, School, BookOpen, Hash } from 'lucide-react';
import { Teacher, DISTRICTS, SUBJECTS, MEDIUMS, DISPATCH_STATUS_COLORS } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface Props {
  teacher: Teacher;
  onClose: () => void;
  onEdit: (t: Teacher) => void;
}

export default function TeacherDetailModal({ teacher, onClose, onEdit }: Props) {
  const subArr = teacher.sub_code_arr || (teacher.sub_code ? teacher.sub_code.split(',') : []);
  const stdArr = teacher.std_arr      || (teacher.std      ? teacher.std.split(',')      : []);
  const medArr = teacher.medium_arr   || (teacher.medium   ? teacher.medium.split(',')   : []);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h2 className="font-semibold text-ink-900 text-lg" style={{ fontFamily: 'Fraunces, serif' }}>
              {teacher.teacher_name}
            </h2>
            <p className="text-xs text-ink-400 font-mono mt-0.5">{teacher.barcode}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(teacher)} className="btn-secondary btn btn-sm">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
              {teacher.isActive ? 'Active' : 'Inactive'}
            </span>
            {teacher.school_type && (
              <span className="badge bg-ink-100 text-ink-600">{teacher.school_type}</span>
            )}
          </div>

          {/* Contact & Address */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Phone size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
              <span className="text-ink-700">{teacher.contact_number}</span>
            </div>
            {teacher.teacher_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
                <span className="text-ink-700 whitespace-pre-line">{teacher.teacher_address}
                  {teacher.pincode && <span className="block text-ink-500 font-mono mt-0.5">📮 {teacher.pincode}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Classification */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-ink-50 rounded-xl">
            <div>
              <p className="text-xs text-ink-400 mb-1">District</p>
              {teacher.dt_code
                ? <p className="text-sm font-medium text-ink-800">{DISTRICTS[teacher.dt_code] || teacher.dt_code} <span className="text-ink-400">({teacher.dt_code})</span></p>
                : <p className="text-sm text-ink-400">—</p>}
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Standard(s)</p>
              {stdArr.length > 0
                ? <div className="flex gap-1 flex-wrap">{stdArr.sort().map(s => <span key={s} className="badge bg-amber-100 text-amber-700 text-xs">Std {s}</span>)}</div>
                : <p className="text-sm text-ink-400">—</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-400 mb-1">Subject(s)</p>
              {subArr.length > 0
                ? <div className="flex gap-1.5 flex-wrap">{subArr.map(s => <span key={s} className="badge bg-brand-100 text-brand-700 text-xs">{SUBJECTS[s] || s}</span>)}</div>
                : <p className="text-sm text-ink-400">—</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-400 mb-1">Medium</p>
              {medArr.length > 0
                ? <div className="flex gap-1.5 flex-wrap">{medArr.map(m => <span key={m} className="badge bg-ink-200 text-ink-700 text-xs">{MEDIUMS[m] || m}</span>)}</div>
                : <p className="text-sm text-ink-400">—</p>}
            </div>
          </div>

          {/* School */}
          {teacher.school_name && (
            <div className="flex items-start gap-2 text-sm">
              <School size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
              <span className="text-ink-700">{teacher.school_name}</span>
            </div>
          )}

          {/* Dispatch history */}
          {teacher.dispatches && teacher.dispatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest mb-2">Dispatch History</p>
              <div className="space-y-2">
                {teacher.dispatches.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-ink-50 rounded-lg text-sm">
                    <span className="text-ink-600">{formatDate(d.dispatch_date)}</span>
                    <div className="flex items-center gap-2">
                      {d.pod_date && <span className="text-xs text-ink-400">POD: {formatDate(d.pod_date)}</span>}
                      <span className={`badge text-xs ${DISPATCH_STATUS_COLORS[d.status] || 'bg-ink-100 text-ink-600'}`}>{d.status}</span>
                      {d.followup_count !== undefined && (
                        <span className="text-xs text-ink-400">{d.followup_count} followup{d.followup_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-ink-400">Added {formatDate(teacher.created_at)}</p>
        </div>
      </div>
    </div>
  );
}