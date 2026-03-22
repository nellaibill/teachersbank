import { MEDIUMS, STANDARDS, SUBJECTS, Teacher, TeacherClassification } from '@/lib/types';

function splitCsv(value?: string) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function sanitizeClassifications(value: unknown): TeacherClassification[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry): TeacherClassification | null => {
      if (!entry || typeof entry !== 'object') return null;

      const record = entry as Record<string, unknown>;
      const std = String(record.std || '').trim();
      const medium = String(record.medium || '').trim();
      const subjects = Array.isArray(record.subjects)
        ? record.subjects
            .map(subject => String(subject || '').trim())
            .filter(subject => Boolean(SUBJECTS[subject]))
        : [];

      if (!STANDARDS.includes(std) || !MEDIUMS[medium] || subjects.length === 0) return null;

      return {
        std,
        medium,
        subjects: Array.from(new Set(subjects)),
      };
    })
    .filter((entry): entry is TeacherClassification => Boolean(entry));
}

export function getTeacherClassifications(teacher?: Partial<Teacher> | null): TeacherClassification[] {
  const parsed = sanitizeClassifications(teacher?.classifications);
  if (parsed.length > 0) return parsed;

  const standards = teacher?.std_arr?.length ? teacher.std_arr : splitCsv(teacher?.std);
  const mediums = teacher?.medium_arr?.length ? teacher.medium_arr : splitCsv(teacher?.medium);
  const subjects = teacher?.sub_code_arr?.length ? teacher.sub_code_arr : splitCsv(teacher?.sub_code);

  if (standards.length === 0 || mediums.length === 0 || subjects.length === 0) return [];

  return standards.flatMap(std =>
    mediums
      .filter(medium => Boolean(MEDIUMS[medium]))
      .map(medium => ({
        std,
        medium,
        subjects: subjects.filter(subject => Boolean(SUBJECTS[subject])),
      }))
  );
}

export function flattenClassifications(classifications: TeacherClassification[]) {
  const std = new Set<string>();
  const medium = new Set<string>();
  const sub_code = new Set<string>();

  for (const entry of classifications) {
    std.add(entry.std);
    medium.add(entry.medium);
    for (const subject of entry.subjects) sub_code.add(subject);
  }

  return {
    std: Array.from(std),
    medium: Array.from(medium),
    sub_code: Array.from(sub_code),
  };
}
