import { MEDIUMS, STANDARDS, SUBJECTS, Teacher, TeacherClassification } from '@/lib/types';

function splitCsv(value?: string) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseClassificationMap(value: string): TeacherClassification[] {
  return value
    .split(';')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map((entry): TeacherClassification | null => {
      const [std = '', medium = '', subjectsRaw = ''] = entry.split('|').map(part => part.trim());
      const subjects = subjectsRaw
        .split(',')
        .map(subject => subject.trim())
        .filter(subject => Boolean(SUBJECTS[subject]));

      if (!STANDARDS.includes(std) || !MEDIUMS[medium] || subjects.length === 0) return null;

      return {
        std,
        medium,
        subjects: Array.from(new Set(subjects)),
      };
    })
    .filter((entry): entry is TeacherClassification => Boolean(entry));
}

export function sanitizeClassifications(value: unknown): TeacherClassification[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return sanitizeClassifications(parsed);
      } catch {
        return [];
      }
    }

    return parseClassificationMap(trimmed);
  }

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
  const parsed = sanitizeClassifications(teacher?.classification_map || teacher?.classifications);
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

export function serializeClassificationMap(classifications: TeacherClassification[]) {
  return classifications
    .map(entry => `${entry.std}|${entry.medium}|${Array.from(new Set(entry.subjects)).join(',')}`)
    .join(';');
}

export function formatClassificationMap(
  teacher?: Partial<Teacher> | null,
  options?: { includeDistrictCode?: string; expanded?: boolean }
) {
  return formatClassificationLines(teacher, options).join(' | ');
}

export function formatClassificationLines(
  teacher?: Partial<Teacher> | null,
  options?: { includeDistrictCode?: string; expanded?: boolean }
) {
  const classifications = getTeacherClassifications(teacher);
  const districtCode = options?.includeDistrictCode || '';

  return classifications
    .map(entry => {
      const medium = options?.expanded ? (MEDIUMS[entry.medium] || entry.medium) : entry.medium;
      const subjects = entry.subjects
        .map(subject => (options?.expanded ? (SUBJECTS[subject] || subject) : subject))
        .join(options?.expanded ? ', ' : ',');

      return [districtCode, `Std ${entry.std}`, medium, subjects].filter(Boolean).join(' / ');
    });
}
