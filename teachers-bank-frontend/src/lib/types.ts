// src/lib/types.ts

export interface Teacher {
  id: number;
  teacher_name: string;
  contact_number: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  dt_code?: string;
  sub_code?: string;
  std?: string;
  year_code?: string;
  medium?: string;
  school_name?: string;
  school_type?: string;
  barcode?: string;
  isActive: number;
  created_at: string;
  updated_at: string;
  dispatches?: Dispatch[];
}

export interface Dispatch {
  id: number;
  teacher_id: number;
  dispatch_date: string;
  pod_date?: string;
  status: 'Dispatched' | 'Delivered' | 'Returned';
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  contact_number?: string;
  school_name?: string;
  barcode?: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  followup_count?: number;
  followups?: Followup[];
}

export interface Followup {
  id: number;
  dispatch_id: number;
  followup_level: number;
  reminder_date: string;
  remarks?: string;
  status: 'Pending' | 'Informed' | 'Completed' | 'No Answer';
  created_at: string;
  updated_at: string;
  // joined fields
  dispatch_date?: string;
  pod_date?: string;
  dispatch_status?: string;
  teacher_name?: string;
  contact_number?: string;
  school_name?: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  barcode?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const SCHOOL_TYPES = [
  'Govt. School',
  'Govt. Aided School',
  'Matriculation School',
  'Corporation School',
];

export const MEDIUMS = ['TM', 'EM'];
export const STANDARDS = ['6', '7', '8', '9', '10', '11', '12'];

export const FOLLOWUP_STATUS_COLORS: Record<string, string> = {
  Pending:   'bg-amber-100 text-amber-700',
  Informed:  'bg-brand-100 text-brand-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  'No Answer': 'bg-ink-100 text-ink-500',
};

export const DISPATCH_STATUS_COLORS: Record<string, string> = {
  Dispatched: 'bg-brand-100 text-brand-700',
  Delivered:  'bg-emerald-100 text-emerald-700',
  Returned:   'bg-rose-100 text-rose-600',
};
