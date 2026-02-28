'use client';
import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Teacher, DISTRICTS, SUBJECTS, MEDIUMS, STANDARDS, SCHOOL_TYPES } from '@/lib/types';
import { teachersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  teacher?: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Chip multi-select ─────────────────────────────────────────────────────────
function ChipSelect({
  label, options, selected, onChange, error,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  }
  return (
    <div>
      <label className="form-label">
        {label} <span className="text-rose-500">*</span>
        <span className="ml-1 text-ink-400 font-normal text-[11px]">(select one or more)</span>
      </label>
      <div className={`flex flex-wrap gap-1.5 mt-1 p-2 border rounded-lg bg-white min-h-[42px] ${error ? 'border-rose-400' : 'border-ink-200'}`}>
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
              selected.includes(opt.value)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-brand-400 hover:bg-brand-50'
            }`}>
            <span className="opacity-60 mr-1">{opt.value}</span>{opt.label}
          </button>
        ))}
      </div>
      {error
        ? <p className="text-xs text-rose-500 mt-1">{error}</p>
        : selected.length > 0 && (
          <p className="text-[11px] text-ink-400 mt-1">
            Selected: <span className="text-ink-700 font-medium">{selected.join(', ')}</span>
          </p>
        )}
    </div>
  );
}

// ── Standard number buttons ───────────────────────────────────────────────────
function StdSelect({ selected, onChange, error }: { selected: string[]; onChange: (v: string[]) => void; error?: string; }) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  }
  return (
    <div>
      <label className="form-label">
        Standard <span className="text-rose-500">*</span>
        <span className="ml-1 text-ink-400 font-normal text-[11px]">(select one or more)</span>
      </label>
      <div className={`flex flex-wrap gap-2 mt-1 p-2 border rounded-lg bg-white ${error ? 'border-rose-400' : 'border-ink-200'}`}>
        {STANDARDS.map(s => (
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`w-11 h-9 rounded-md text-sm font-semibold border transition-all ${
              selected.includes(s)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-brand-400'
            }`}>
            {s}
          </button>
        ))}
      </div>
      {error
        ? <p className="text-xs text-rose-500 mt-1">{error}</p>
        : selected.length > 0 && (
          <p className="text-[11px] text-ink-400 mt-1">
            Selected: <span className="text-ink-700 font-medium">Std {[...selected].sort((a,b)=>+a-+b).join(', ')}</span>
          </p>
        )}
    </div>
  );
}

// ── Medium toggle buttons ─────────────────────────────────────────────────────
function MediumSelect({ selected, onChange, error }: { selected: string[]; onChange: (v: string[]) => void; error?: string; }) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  }
  return (
    <div>
      <label className="form-label">
        Medium <span className="text-rose-500">*</span>
        <span className="ml-1 text-ink-400 font-normal text-[11px]">(select one or more)</span>
      </label>
      <div className={`flex gap-3 mt-1 p-2 border rounded-lg bg-white ${error ? 'border-rose-400' : 'border-ink-200'}`}>
        {Object.entries(MEDIUMS).map(([code, name]) => (
          <button key={code} type="button" onClick={() => toggle(code)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              selected.includes(code)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-brand-400'
            }`}>
            <span className="font-mono">{code}</span>
            <span className="ml-2 opacity-80 text-xs">{name}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function TeacherFormModal({ teacher, onClose, onSaved }: Props) {
  const isEdit = !!teacher;

  const [form, setForm] = useState({
    teacher_name:    teacher?.teacher_name    || '',
    contact_number:  teacher?.contact_number  || '',
    teacher_address: teacher?.teacher_address || '',
    pincode:         teacher?.pincode         || '',
    dt_code:         teacher?.dt_code         || '',
    sub_code:        teacher?.sub_code_arr    || (teacher?.sub_code ? teacher.sub_code.split(',') : []) as string[],
    std:             teacher?.std_arr         || (teacher?.std      ? teacher.std.split(',')      : []) as string[],
    medium:          teacher?.medium_arr      || (teacher?.medium   ? teacher.medium.split(',')   : []) as string[],
    school_name:     teacher?.school_name     || '',
    school_type:     teacher?.school_type     || '',
    isActive:        teacher?.isActive ?? 1,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const ne = { ...e }; delete ne[k]; return ne; });
  };

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.teacher_name.trim())    errs.teacher_name   = 'Teacher name is required';
    if (!form.contact_number.trim())  errs.contact_number = 'Contact number is required';
    if (!form.teacher_address.trim()) errs.teacher_address = 'Teacher address is required';

    if (!form.pincode.trim()) {
      errs.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(form.pincode)) {
      errs.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!form.dt_code)              errs.dt_code    = 'District is required';
    if (form.sub_code.length === 0) errs.sub_code   = 'At least one subject is required';
    if (form.std.length === 0)      errs.std        = 'At least one standard is required';
    if (form.medium.length === 0)   errs.medium     = 'At least one medium is required';
    if (!form.school_name.trim())   errs.school_name = 'School name is required';
    if (!form.school_type)          errs.school_type = 'School type is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill in all required fields');
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-ink-900 text-lg" style={{ fontFamily: 'Fraunces, serif' }}>
              {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
            </h2>
            <p className="text-xs text-ink-400 mt-0.5">All fields marked <span className="text-rose-500">*</span> are required</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* ── Basic Info ── */}
          <section>
            <p className="section-label">Basic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Teacher Name <span className="text-rose-500">*</span></label>
                <input className={`form-input ${errors.teacher_name ? 'border-rose-400' : ''}`}
                  value={form.teacher_name} onChange={e => set('teacher_name', e.target.value)}
                  placeholder="Full name" />
                {errors.teacher_name && <p className="field-error">{errors.teacher_name}</p>}
              </div>
              <div>
                <label className="form-label">Contact Number <span className="text-rose-500">*</span></label>
                <input className={`form-input ${errors.contact_number ? 'border-rose-400' : ''}`}
                  value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="Mobile number" inputMode="numeric" />
                {errors.contact_number && <p className="field-error">{errors.contact_number}</p>}
              </div>
            </div>
          </section>

          {/* ── Address ── */}
          <section>
            <p className="section-label">Address</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Teacher Address <span className="text-rose-500">*</span></label>
                <textarea className={`form-input resize-none ${errors.teacher_address ? 'border-rose-400' : ''}`}
                  rows={3} value={form.teacher_address}
                  onChange={e => set('teacher_address', e.target.value)}
                  placeholder="Door no, Street, Area, Town, District" />
                {errors.teacher_address && <p className="field-error">{errors.teacher_address}</p>}
              </div>
              <div className="w-44">
                <label className="form-label">Pincode <span className="text-rose-500">*</span></label>
                <input className={`form-input font-mono tracking-widest ${errors.pincode ? 'border-rose-400' : ''}`}
                  value={form.pincode}
                  onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digits" maxLength={6} inputMode="numeric" />
                {errors.pincode
                  ? <p className="field-error">{errors.pincode}</p>
                  : <p className="text-[11px] text-ink-400 mt-1">Numbers only · exactly 6 digits</p>}
              </div>
            </div>
          </section>

          {/* ── Classification ── */}
          <section>
            <p className="section-label">Classification</p>
            <div className="space-y-4">

              {/* District — single select dropdown */}
              <div>
                <label className="form-label">District <span className="text-rose-500">*</span></label>
                <select className={`form-select ${errors.dt_code ? 'border-rose-400' : ''}`}
                  value={form.dt_code} onChange={e => set('dt_code', e.target.value)}>
                  <option value="">— Select District —</option>
                  {Object.entries(DISTRICTS)
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                </select>
                {errors.dt_code && <p className="field-error">{errors.dt_code}</p>}
              </div>

              {/* Subject — multi chip */}
              <ChipSelect
                label="Subject(s)"
                options={Object.entries(SUBJECTS).map(([v, l]) => ({ value: v, label: l }))}
                selected={form.sub_code}
                onChange={v => set('sub_code', v)}
                error={errors.sub_code}
              />

              {/* Standard — number buttons */}
              <StdSelect
                selected={form.std}
                onChange={v => set('std', v)}
                error={errors.std}
              />

              {/* Medium — toggle buttons */}
              <MediumSelect
                selected={form.medium}
                onChange={v => set('medium', v)}
                error={errors.medium}
              />

            </div>
          </section>

          {/* ── School ── */}
          <section>
            <p className="section-label">School</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">School Name <span className="text-rose-500">*</span></label>
                <input className={`form-input ${errors.school_name ? 'border-rose-400' : ''}`}
                  value={form.school_name} onChange={e => set('school_name', e.target.value)}
                  placeholder="Full school name with location" />
                {errors.school_name && <p className="field-error">{errors.school_name}</p>}
              </div>
              <div>
                <label className="form-label">School Type <span className="text-rose-500">*</span></label>
                <select className={`form-select ${errors.school_type ? 'border-rose-400' : ''}`}
                  value={form.school_type} onChange={e => set('school_type', e.target.value)}>
                  <option value="">— Select School Type —</option>
                  {SCHOOL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.school_type && <p className="field-error">{errors.school_type}</p>}
              </div>
            </div>
          </section>

          {/* Status (edit only) */}
          {isEdit && (
            <section>
              <p className="section-label">Status</p>
              <select className="form-select w-44" value={form.isActive}
                onChange={e => set('isActive', Number(e.target.value))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </section>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-ink-100 sticky bottom-0 bg-white pb-1">
            <button type="button" onClick={onClose} className="btn-secondary btn flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary btn flex-1">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Update Teacher' : 'Create Teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}