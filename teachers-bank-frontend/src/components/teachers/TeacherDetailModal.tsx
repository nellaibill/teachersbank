'use client';
import { X, Edit2, Phone, MapPin, School, Tag, Printer } from 'lucide-react';
import { Teacher } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import dynamic from 'next/dynamic';

interface Props {
  teacher: Teacher;
  onClose: () => void;
  onEdit: (t: Teacher) => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-ink-50 last:border-0">
      <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-ink-800">{value}</span>
    </div>
  );
}

export default function TeacherDetailModal({ teacher, onClose, onEdit }: Props) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-ink-50 rounded-t-2xl">
          <div>
            <h2 className="font-semibold text-ink-900" style={{ fontFamily: 'Fraunces, serif' }}>
              {teacher.teacher_name}
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">ID #{teacher.id} · {teacher.dt_code}/{teacher.sub_code}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-ghost btn btn-sm no-print">
              <Printer size={14} /> Print
            </button>
            <button onClick={() => onEdit(teacher)} className="btn-primary btn btn-sm no-print">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={onClose} className="btn-icon btn-ghost no-print">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Barcode */}
          {teacher.barcode && (
            <div className="flex flex-col items-center p-4 bg-white border border-ink-100 rounded-xl">
              <BarcodeDisplay value={teacher.barcode} height={56} fontSize={11} />
            </div>
          )}

          {/* Details */}
          <div>
            <Row label="Contact" value={teacher.contact_number} />
            <Row label="Address" value={[teacher.address_1, teacher.address_2, teacher.address_3].filter(Boolean).join(', ')} />
            <Row label="School" value={teacher.school_name} />
            <Row label="School Type" value={teacher.school_type} />
            <Row label="DT Code" value={teacher.dt_code} />
            <Row label="Subject" value={teacher.sub_code} />
            <Row label="Standard" value={teacher.std} />
            <Row label="Medium" value={teacher.medium} />
            <Row label="Year Code" value={teacher.year_code} />
            <Row label="Status" value={teacher.isActive ? 'Active' : 'Inactive'} />
            <Row label="Registered" value={formatDate(teacher.created_at)} />
          </div>

          {/* Recent dispatches */}
          {teacher.dispatches && teacher.dispatches.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">Dispatch History</h3>
              <div className="space-y-1">
                {teacher.dispatches.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex justify-between text-sm py-1.5 border-b border-ink-50">
                    <span className="text-ink-600">{formatDate(d.dispatch_date)}</span>
                    <span className={`badge text-xs ${d.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
