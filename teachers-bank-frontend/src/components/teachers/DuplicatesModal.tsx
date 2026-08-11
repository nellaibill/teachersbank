'use client';
import { X, AlertTriangle, Phone, MapPin, BookOpen } from 'lucide-react';
import { Teacher, DISTRICTS, SUBJECTS, MEDIUMS } from '@/lib/types';
import { getTeacherClassifications } from '@/lib/teacherClassifications';

interface DuplicateGroup {
  contact_number: string;
  count: number;
  teachers: Teacher[];
}

interface DuplicatesModalProps {
  isOpen: boolean;
  duplicates: DuplicateGroup[];
  totalGroups: number;
  totalDuplicateTeachers: number;
  onClose: () => void;
  onSelectTeacher?: (teacher: Teacher) => void;
}

export default function DuplicatesModal({
  isOpen,
  duplicates,
  totalGroups,
  totalDuplicateTeachers,
  onClose,
  onSelectTeacher,
}: DuplicatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              Duplicate Teachers by Mobile Number
            </h2>
            <p className="text-sm text-ink-500 mt-1">
              Found <span className="font-semibold text-amber-700">{totalGroups}</span> duplicate groups with{' '}
              <span className="font-semibold text-amber-700">{totalDuplicateTeachers}</span> duplicate records
            </p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost text-ink-400 hover:text-ink-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {duplicates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-ink-500">No duplicate records found.</p>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {duplicates.map((group, groupIdx) => (
                <div
                  key={`${group.contact_number}-${groupIdx}`}
                  className="border border-amber-200 rounded-lg bg-amber-50 overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="bg-amber-100 px-4 py-3 border-b border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-amber-700" />
                        <div>
                          <p className="font-semibold text-ink-900">{group.contact_number}</p>
                          <p className="text-xs text-ink-600">{group.count} duplicate records</p>
                        </div>
                      </div>
                      <span className="badge bg-amber-200 text-amber-800 text-xs font-semibold">
                        {group.count} entries
                      </span>
                    </div>
                  </div>

                  {/* Teachers List */}
                  <div className="space-y-3 p-4">
                    {group.teachers.map((teacher, teacherIdx) => {
                      const classifications = getTeacherClassifications(teacher);
                      return (
                        <div
                          key={`${teacher.id}-${teacherIdx}`}
                          className="bg-white border border-ink-100 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Teacher Info */}
                            <div>
                              <p className="text-xs font-semibold uppercase text-ink-400 mb-1">Teacher</p>
                              <p className="font-semibold text-ink-900">{teacher.teacher_name}</p>
                              <div className="flex items-center gap-1.5 text-sm text-ink-600 mt-2">
                                <Phone size={12} className="text-ink-400" />
                                {teacher.contact_number}
                              </div>
                              {teacher.pincode && (
                                <div className="flex items-center gap-1.5 text-sm text-ink-600 mt-1">
                                  <MapPin size={12} className="text-ink-400" />
                                  {teacher.pincode}
                                </div>
                              )}
                              {teacher.teacher_address && (
                                <p className="text-xs text-ink-500 mt-2 line-clamp-2">{teacher.teacher_address}</p>
                              )}
                            </div>

                            {/* School & District */}
                            <div>
                              <p className="text-xs font-semibold uppercase text-ink-400 mb-1">School & District</p>
                              <p className="font-medium text-ink-900 text-sm">{teacher.school_name || '—'}</p>
                              {teacher.school_type && (
                                <p className="text-xs text-ink-600 mt-1">{teacher.school_type}</p>
                              )}
                              {teacher.dt_code && (
                                <div className="mt-2">
                                  <span className="badge bg-ink-100 text-ink-700 text-xs">
                                    {DISTRICTS[teacher.dt_code] || teacher.dt_code}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Classifications */}
                            <div>
                              <p className="text-xs font-semibold uppercase text-ink-400 mb-1 flex items-center gap-1">
                                <BookOpen size={12} /> Subjects
                              </p>
                              {classifications.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {classifications.flatMap((entry, rowIndex) =>
                                    entry.subjects.map((subject) => (
                                      <span
                                        key={`${rowIndex}-${entry.std}-${entry.medium}-${subject}`}
                                        className="badge bg-brand-100 text-brand-700 text-[10px]"
                                      >
                                        {SUBJECTS[subject] || subject}
                                        <span className="ml-1 opacity-70">Std {entry.std}</span>
                                      </span>
                                    ))
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-ink-400">No classifications</p>
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="mt-3 pt-3 border-t border-ink-100 flex justify-between items-center">
                            <p className="text-[11px] text-ink-400">
                              ID: <span className="font-mono">{teacher.id}</span> |{' '}
                              {teacher.barcode && (
                                <>
                                  Barcode: <span className="font-mono">{teacher.barcode}</span>
                                </>
                              )}
                            </p>
                            {onSelectTeacher && (
                              <button
                                onClick={() => {
                                  onSelectTeacher(teacher);
                                  onClose();
                                }}
                                className="btn-primary btn btn-sm"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-200 px-6 py-4 bg-ink-50 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary btn w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
