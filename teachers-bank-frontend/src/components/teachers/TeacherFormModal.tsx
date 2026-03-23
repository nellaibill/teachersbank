'use client';
import { useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Teacher,
  TeacherClassification,
  DISTRICTS,
  SUBJECTS,
  MEDIUMS,
  STANDARDS,
  SCHOOL_TYPES,
  SUBJECT_STANDARD_MAP,
} from '@/lib/types';
import { flattenClassifications, getTeacherClassifications, serializeClassificationMap } from '@/lib/teacherClassifications';
import { teachersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  teacher?: Teacher | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  teacher_name: string;
  contact_number: string;
  teacher_address: string;
  pincode: string;
  dt_code: string;
  classifications: TeacherClassification[];
  school_name: string;
  school_type: string;
  remarks: string;
  isActive: number;
}

function createEmptyClassification(): TeacherClassification {
  return { std: '', medium: '', subjects: [] };
}

function ClassificationRow({
  entry,
  onChange,
  onRemove,
  disableRemove,
  error,
}: {
  entry: TeacherClassification;
  onChange: (entry: TeacherClassification) => void;
  onRemove: () => void;
  disableRemove: boolean;
  error?: string;
}) {
  const allowedSubjects = Object.entries(SUBJECTS).filter(([code]) => {
    if (!entry.std) return true;
    return (SUBJECT_STANDARD_MAP[code] || STANDARDS).includes(entry.std);
  });

  function toggleSubject(subject: string) {
    const nextSubjects = entry.subjects.includes(subject)
      ? entry.subjects.filter(item => item !== subject)
      : [...entry.subjects, subject];

    onChange({ ...entry, subjects: nextSubjects });
  }

  function handleStdChange(std: string) {
    const nextSubjects = entry.subjects.filter(subject =>
      (SUBJECT_STANDARD_MAP[subject] || STANDARDS).includes(std)
    );

    onChange({ ...entry, std, subjects: nextSubjects });
  }

  return (
    <div className={`rounded-xl border p-4 ${error ? 'border-rose-400 bg-rose-50/40' : 'border-ink-200 bg-ink-50/40'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-800">Classification Row</p>
          <p className="text-[11px] text-ink-400 mt-0.5">Bind standard, medium, and subjects in one entry.</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disableRemove}
          className="btn-ghost btn btn-icon btn-sm text-rose-500 disabled:text-ink-300 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="form-label">Standard <span className="text-rose-500">*</span></label>
          <select className="form-select" value={entry.std} onChange={e => handleStdChange(e.target.value)}>
            <option value="">Select standard</option>
            {STANDARDS.map(std => (
              <option key={std} value={std}>Std {std}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Medium <span className="text-rose-500">*</span></label>
          <div className="flex gap-2 mt-1">
            {Object.entries(MEDIUMS).map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => onChange({ ...entry, medium: code })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                  entry.medium === code
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-ink-600 border-ink-200 hover:border-brand-400'
                }`}
              >
                <span className="font-mono">{code}</span>
                <span className="ml-2 opacity-80 text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="form-label">Subject(s) <span className="text-rose-500">*</span></label>
        <div className="flex flex-wrap gap-1.5 mt-1 p-2 border border-ink-200 rounded-lg bg-white min-h-[42px]">
          {allowedSubjects.map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleSubject(code)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                entry.subjects.includes(code)
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-brand-400 hover:bg-brand-50'
              }`}
            >
              <span className="opacity-60 mr-1">{code}</span>
              {label}
            </button>
          ))}
        </div>
        {entry.subjects.length > 0 && (
          <p className="text-[11px] text-ink-400 mt-1">
            Selected: <span className="text-ink-700 font-medium">{entry.subjects.join(', ')}</span>
          </p>
        )}
        {error && <p className="field-error">{error}</p>}
      </div>
    </div>
  );
}

export default function TeacherFormModal({ teacher, onClose, onSaved }: Props) {
  const isEdit = !!teacher;
  const initialClassifications = getTeacherClassifications(teacher);

  const [form, setForm] = useState<FormState>({
    teacher_name: teacher?.teacher_name || '',
    contact_number: teacher?.contact_number || '',
    teacher_address: teacher?.teacher_address || '',
    pincode: teacher?.pincode || '',
    dt_code: teacher?.dt_code || '',
    classifications: initialClassifications.length > 0 ? initialClassifications : [createEmptyClassification()],
    school_name: teacher?.school_name || '',
    school_type: teacher?.school_type || '',
    remarks: teacher?.remarks || '',
    isActive: teacher?.isActive ?? 1,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  function setClassification(index: number, value: TeacherClassification) {
    const next = form.classifications.map((entry, entryIndex) => (entryIndex === index ? value : entry));
    set('classifications', next);
    setErrors(current => {
      const nextErrors = { ...current };
      delete nextErrors[`classifications.${index}`];
      delete nextErrors.classifications;
      return nextErrors;
    });
  }

  function addClassification() {
    set('classifications', [...form.classifications, createEmptyClassification()]);
  }

  function removeClassification(index: number) {
    if (form.classifications.length === 1) {
      setClassification(0, createEmptyClassification());
      return;
    }

    set('classifications', form.classifications.filter((_, entryIndex) => entryIndex !== index));
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!form.teacher_name.trim()) nextErrors.teacher_name = 'Teacher name is required';
    if (!form.contact_number.trim()) nextErrors.contact_number = 'Contact number is required';
    if (!form.teacher_address.trim()) nextErrors.teacher_address = 'Teacher address is required';

    if (!form.pincode.trim()) {
      nextErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(form.pincode)) {
      nextErrors.pincode = 'Pincode must be exactly 6 digits';
    }

    if (!form.dt_code) nextErrors.dt_code = 'District is required';
    if (!form.school_name.trim()) nextErrors.school_name = 'School name is required';
    if (!form.school_type) nextErrors.school_type = 'School type is required';

    const validRows = form.classifications.filter(entry => entry.std && entry.medium && entry.subjects.length > 0);
    if (validRows.length === 0) {
      nextErrors.classifications = 'Add at least one valid classification row';
    }

    form.classifications.forEach((entry, index) => {
      if (!entry.std || !entry.medium || entry.subjects.length === 0) {
        nextErrors[`classifications.${index}`] = 'Standard, medium, and at least one subject are required';
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const normalizedClassifications = form.classifications.map(entry => ({
        std: entry.std,
        medium: entry.medium,
        subjects: Array.from(new Set(entry.subjects)),
      }));
      const flattened = flattenClassifications(normalizedClassifications);
      const payload = {
        ...form,
        classifications: normalizedClassifications,
        classification_map: serializeClassificationMap(normalizedClassifications),
        std: flattened.std,
        medium: flattened.medium,
        sub_code: flattened.sub_code,
      };

      if (isEdit) {
        await teachersApi.update(teacher!.id, payload);
        toast.success('Teacher updated successfully');
      } else {
        await teachersApi.create(payload);
        toast.success('Teacher created successfully');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-3xl">
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
          <section>
            <p className="section-label">Basic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Teacher Name <span className="text-rose-500">*</span></label>
                <input
                  className={`form-input ${errors.teacher_name ? 'border-rose-400' : ''}`}
                  value={form.teacher_name}
                  onChange={e => set('teacher_name', e.target.value)}
                  placeholder="Full name"
                />
                {errors.teacher_name && <p className="field-error">{errors.teacher_name}</p>}
              </div>
              <div>
                <label className="form-label">Contact Number <span className="text-rose-500">*</span></label>
                <input
                  className={`form-input ${errors.contact_number ? 'border-rose-400' : ''}`}
                  value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="Mobile number"
                  inputMode="numeric"
                />
                {errors.contact_number && <p className="field-error">{errors.contact_number}</p>}
              </div>
            </div>
          </section>

          <section>
            <p className="section-label">Address</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Teacher Address <span className="text-rose-500">*</span></label>
                <textarea
                  className={`form-input resize-none ${errors.teacher_address ? 'border-rose-400' : ''}`}
                  rows={3}
                  value={form.teacher_address}
                  onChange={e => set('teacher_address', e.target.value)}
                  placeholder="Door no, Street, Area, Town, District"
                />
                {errors.teacher_address && <p className="field-error">{errors.teacher_address}</p>}
              </div>
              <div className="w-44">
                <label className="form-label">Pincode <span className="text-rose-500">*</span></label>
                <input
                  className={`form-input font-mono tracking-widest ${errors.pincode ? 'border-rose-400' : ''}`}
                  value={form.pincode}
                  onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digits"
                  maxLength={6}
                  inputMode="numeric"
                />
                {errors.pincode
                  ? <p className="field-error">{errors.pincode}</p>
                  : <p className="text-[11px] text-ink-400 mt-1">Numbers only · exactly 6 digits</p>}
              </div>
            </div>
          </section>

          <section>
            <p className="section-label">Classification</p>
            <div className="space-y-4">
              <div>
                <label className="form-label">District <span className="text-rose-500">*</span></label>
                <select
                  className={`form-select ${errors.dt_code ? 'border-rose-400' : ''}`}
                  value={form.dt_code}
                  onChange={e => set('dt_code', e.target.value)}
                >
                  <option value="">Select District</option>
                  {Object.entries(DISTRICTS)
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                </select>
                {errors.dt_code && <p className="field-error">{errors.dt_code}</p>}
              </div>

              <div className="space-y-3">
                {form.classifications.map((entry, index) => (
                  <ClassificationRow
                    key={`${index}-${entry.std}-${entry.medium}`}
                    entry={entry}
                    onChange={value => setClassification(index, value)}
                    onRemove={() => removeClassification(index)}
                    disableRemove={form.classifications.length === 1}
                    error={errors[`classifications.${index}`]}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                {errors.classifications ? (
                  <p className="field-error">{errors.classifications}</p>
                ) : (
                  <p className="text-[11px] text-ink-400">
                    Example: Std 6 + Tamil Medium + Maths is one row, Std 7 + English Medium + Science is another row.
                  </p>
                )}
                <button type="button" onClick={addClassification} className="btn-secondary btn btn-sm whitespace-nowrap">
                  <Plus size={14} /> Add Row
                </button>
              </div>
            </div>
          </section>

          <section>
            <p className="section-label">School</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">School Name <span className="text-rose-500">*</span></label>
                <input
                  className={`form-input ${errors.school_name ? 'border-rose-400' : ''}`}
                  value={form.school_name}
                  onChange={e => set('school_name', e.target.value)}
                  placeholder="Full school name with location"
                />
                {errors.school_name && <p className="field-error">{errors.school_name}</p>}
              </div>
              <div>
                <label className="form-label">School Type <span className="text-rose-500">*</span></label>
                <select
                  className={`form-select ${errors.school_type ? 'border-rose-400' : ''}`}
                  value={form.school_type}
                  onChange={e => set('school_type', e.target.value)}
                >
                  <option value="">Select School Type</option>
                  {SCHOOL_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.school_type && <p className="field-error">{errors.school_type}</p>}
              </div>
            </div>
          </section>

          <section>
            <p className="section-label">Remarks</p>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.remarks}
              onChange={e => set('remarks', e.target.value)}
              placeholder="Optional notes (e.g. special delivery instructions)"
            />
          </section>

          {isEdit && (
            <section>
              <p className="section-label">Status</p>
              <select className="form-select w-44" value={form.isActive} onChange={e => set('isActive', Number(e.target.value))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </section>
          )}

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
