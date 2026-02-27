'use client';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { teachersApi } from '@/lib/api';
import { Teacher, SCHOOL_TYPES, MEDIUMS, STANDARDS } from '@/lib/types';
import toast from 'react-hot-toast';

interface Props {
  teacher?: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  teacher_name: '', contact_number: '', address_1: '', address_2: '', address_3: '',
  dt_code: '', sub_code: '', std: '', year_code: '', medium: '', school_name: '', school_type: '', isActive: 1
};

export default function TeacherFormModal({ teacher, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const isEdit = !!teacher;

  useEffect(() => {
    if (teacher) {
      setForm({
        teacher_name: teacher.teacher_name || '',
        contact_number: teacher.contact_number || '',
        address_1: teacher.address_1 || '',
        address_2: teacher.address_2 || '',
        address_3: teacher.address_3 || '',
        dt_code: teacher.dt_code || '',
        sub_code: teacher.sub_code || '',
        std: teacher.std || '',
        year_code: teacher.year_code || '',
        medium: teacher.medium || '',
        school_name: teacher.school_name || '',
        school_type: teacher.school_type || '',
        isActive: teacher.isActive ?? 1,
      });
    }
  }, [teacher]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.teacher_name.trim() || !form.contact_number.trim()) {
      toast.error('Teacher name and contact number are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await teachersApi.update(teacher!.id, form);
        toast.success('Teacher updated successfully');
      } else {
        await teachersApi.create(form);
        toast.success('Teacher created successfully');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h2 className="font-semibold text-ink-900 text-lg" style={{ fontFamily: 'Fraunces, serif' }}>
            {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
          </h2>
          <button onClick={onClose} className="btn-icon btn-ghost text-ink-400 hover:text-ink-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Teacher Name <span className="text-rose-500">*</span></label>
              <input className="form-input" value={form.teacher_name}
                onChange={e => set('teacher_name', e.target.value)} placeholder="Mr. / Ms. Full Name" />
            </div>
            <div>
              <label className="form-label">Contact Number <span className="text-rose-500">*</span></label>
              <input className="form-input" value={form.contact_number} type="tel"
                onChange={e => set('contact_number', e.target.value)} placeholder="9XXXXXXXXX" />
            </div>
            <div>
              <label className="form-label">Year Code</label>
              <input className="form-input" value={form.year_code}
                onChange={e => set('year_code', e.target.value)} placeholder="2025" />
            </div>
          </div>

          {/* Codes */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="form-label">DT Code</label>
              <input className="form-input" value={form.dt_code}
                onChange={e => set('dt_code', e.target.value.toUpperCase())} placeholder="ARL" maxLength={10} />
            </div>
            <div>
              <label className="form-label">Subject Code</label>
              <input className="form-input" value={form.sub_code}
                onChange={e => set('sub_code', e.target.value.toUpperCase())} placeholder="MAT" maxLength={10} />
            </div>
            <div>
              <label className="form-label">Standard</label>
              <select className="form-select" value={form.std} onChange={e => set('std', e.target.value)}>
                <option value="">Select</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Medium</label>
              <select className="form-select" value={form.medium} onChange={e => set('medium', e.target.value)}>
                <option value="">Select</option>
                {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="form-label">Teacher's Address</label>
            <input className="form-input" value={form.address_1}
              onChange={e => set('address_1', e.target.value)} placeholder="Street / Door No" />
            <input className="form-input" value={form.address_2}
              onChange={e => set('address_2', e.target.value)} placeholder="Area / Taluk" />
            <input className="form-input" value={form.address_3}
              onChange={e => set('address_3', e.target.value)} placeholder="District - PIN Code" />
          </div>

          {/* School */}
          <div className="space-y-2">
            <label className="form-label">School Name (with address)</label>
            <textarea className="form-input resize-none" rows={2} value={form.school_name}
              onChange={e => set('school_name', e.target.value)} placeholder="School name and address" />
            <div>
              <label className="form-label">School Type</label>
              <select className="form-select" value={form.school_type} onChange={e => set('school_type', e.target.value)}>
                <option value="">Select type</option>
                {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <label className="form-label mb-0">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive === 1}
                  onChange={e => set('isActive', e.target.checked ? 1 : 0)}
                  className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-ink-700">Active</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="btn-secondary btn">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary btn">
              {saving && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Update Teacher' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
