'use client';
import { X, Edit2, Phone, MapPin, School } from 'lucide-react';
import { Teacher, DISTRICTS, SUBJECTS, MEDIUMS, DISPATCH_STATUS_COLORS } from '@/lib/types';
import { getTeacherClassifications } from '@/lib/teacherClassifications';
import { formatDate } from '@/lib/utils';

interface Props {
  teacher: Teacher;
  onClose: () => void;
  onEdit?: (t: Teacher) => void;
  canEdit?: boolean;
}

export default function TeacherDetailModal({ teacher, onClose, onEdit, canEdit = true }: Props) {
  const classifications = getTeacherClassifications(teacher);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h2 className="font-semibold text-ink-900 text-lg" style={{ fontFamily: 'Fraunces, serif' }}>
              {teacher.teacher_name}
            </h2>
            <p className="text-xs text-ink-400 font-mono mt-0.5">{teacher.barcode}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <button onClick={() => onEdit(teacher)} className="btn-secondary btn btn-sm">
                <Edit2 size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${teacher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
              {teacher.isActive ? 'Active' : 'Inactive'}
            </span>
            {teacher.school_type && <span className="badge bg-ink-100 text-ink-600">{teacher.school_type}</span>}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Phone size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
              <span className="text-ink-700">{teacher.contact_number}</span>
            </div>
            {teacher.teacher_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
                <span className="text-ink-700 whitespace-pre-line">
                  {teacher.teacher_address}
                  {teacher.pincode && <span className="block text-ink-500 font-mono mt-0.5">Pin: {teacher.pincode}</span>}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-ink-50 rounded-xl">
            <div className="col-span-2">
              <p className="text-xs text-ink-400 mb-1">District</p>
              {teacher.dt_code
                ? <p className="text-sm font-medium text-ink-800">{DISTRICTS[teacher.dt_code] || teacher.dt_code} <span className="text-ink-400">({teacher.dt_code})</span></p>
                : <p className="text-sm text-ink-400">-</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs text-ink-400 mb-2">Classification Mapping</p>
              {classifications.length > 0 ? (
                <div className="space-y-2">
                  {classifications.map((entry, index) => (
                    <div key={`${entry.std}-${entry.medium}-${index}`} className="rounded-lg border border-ink-200 bg-white px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="badge bg-amber-100 text-amber-700 text-xs">Std {entry.std}</span>
                        <span className="badge bg-ink-200 text-ink-700 text-xs">{MEDIUMS[entry.medium] || entry.medium}</span>
                        {entry.subjects.map(subject => (
                          <span key={subject} className="badge bg-brand-100 text-brand-700 text-xs">
                            {SUBJECTS[subject] || subject}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-400">-</p>
              )}
            </div>
          </div>

          {teacher.school_name && (
            <div className="flex items-start gap-2 text-sm">
              <School size={14} className="text-ink-400 mt-0.5 flex-shrink-0" />
              <span className="text-ink-700">{teacher.school_name}</span>
            </div>
          )}

          {teacher.dispatches && teacher.dispatches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest mb-2">Dispatch History</p>
              <div className="space-y-2">
                {teacher.dispatches.map(dispatch => (
                  <div key={dispatch.id} className="flex items-center justify-between px-3 py-2 bg-ink-50 rounded-lg text-sm">
                    <span className="text-ink-600">{formatDate(dispatch.dispatch_date)}</span>
                    <div className="flex items-center gap-2">
                      {dispatch.pod_date && <span className="text-xs text-ink-400">POD: {formatDate(dispatch.pod_date)}</span>}
                      <span className={`badge text-xs ${DISPATCH_STATUS_COLORS[dispatch.status] || 'bg-ink-100 text-ink-600'}`}>{dispatch.status}</span>
                      {dispatch.followup_count !== undefined && (
                        <span className="text-xs text-ink-400">{dispatch.followup_count} followup{dispatch.followup_count !== 1 ? 's' : ''}</span>
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
