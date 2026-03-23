// src/lib/types.ts
// CHANGES: remarks added to Teacher; po_number added to Dispatch

export interface Teacher {
  id: number;
  teacher_name: string;
  contact_number: string;
  teacher_address?: string;
  pincode?: string;
  dt_code?: string;
  sub_code?: string;
  sub_code_arr?: string[];
  std?: string;
  std_arr?: string[];
  medium?: string;
  medium_arr?: string[];
  classifications?: TeacherClassification[] | string;
  classification_map?: string;
  school_name?: string;
  school_type?: string;
  remarks?: string;           // ← NEW
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
  po_number?: string;         // ← NEW
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  contact_number?: string;
  school_name?: string;
  barcode?: string;
  teacher_address?: string;
  pincode?: string;
  followup_count?: number;
  followups?: Followup[];
}

export interface Followup {
  id: number;
  dispatch_id: number;
  followup_level: number;
  reminder_date: string;
  remarks?: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'No Answer' | 'Informed';
  created_at: string;
  updated_at: string;
  dispatch_date?: string;
  pod_date?: string;
  dispatch_status?: string;
  teacher_name?: string;
  contact_number?: string;
  school_name?: string;
  teacher_address?: string;
  pincode?: string;
  barcode?: string;
  level_history?: Array<{
    id: number;
    followup_level: number;
    reminder_date: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'No Answer' | 'Informed';
    remarks?: string;
    updated_at?: string;
  }>;
}

export interface TeacherClassification {
  std: string;
  medium: string;
  subjects: string[];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const DISTRICTS: Record<string, string> = {
  ALR: 'Ariyalur',      CGP: 'Chengalpattu',   CHN: 'Chennai',
  CBE: 'Coimbatore',    CUD: 'Cuddalore',       DPI: 'Dharmapuri',
  DGL: 'Dindigul',      ERD: 'Erode',           KLK: 'Kallakurichi',
  KPM: 'Kanchipuram',   KKI: 'Kanyakumari',     KRL: 'Karaikal',
  KRR: 'Karur',         KGI: 'Krishnagiri',     MDU: 'Madurai',
  MYD: 'Mayiladuthurai',NPM: 'Nagapattinam',    NKL: 'Namakkal',
  NLG: 'Nilgiris',      PLR: 'Perambalur',      PDY: 'Pondicherry',
  PDK: 'Pudukottai',    RPM: 'Ramanathapuram',  RPT: 'Ranipet',
  SLM: 'Salem',         SGI: 'Sivagangai',      TJR: 'Thanjavur',
  TEN: 'Tenkasi',       TNI: 'Theni',           TVM: 'Thiruvannamalai',
  TUT: 'Thoothukudi',   TRY: 'Tiruchirappalli', TVL: 'Tirunelveli',
  TPT: 'Tirupathur',    TPR: 'Tiruppur',        TLR: 'Tiruvallur',
  TVR: 'Tiruvarur',     VLR: 'Vellore',         VPM: 'Villupuram',
  VNR: 'Virudhunagar',
};

export const SUBJECTS: Record<string, string> = {
  TAM: 'Tamil',    ENG: 'English',  MAT: 'Maths',
  SCI: 'Science',  SS:  'Social Science', PHY: 'Physics',
  CHE: 'Chemistry',BIO: 'Biology',  BOT: 'Botany',
  ZOO: 'Zoology',  CS:  'Computer Science', CA: 'Computer Applications',
  BM:  'Business Maths', ECO: 'Economics', COM: 'Commerce',
  ACC: 'Accountancy',    HIS: 'History',
};

export const MEDIUMS: Record<string, string> = {
  TM: 'Tamil Medium',
  EM: 'English Medium',
};

export const STANDARDS = ['6', '7', '8', '9', '10', '11', '12'];

export const SUBJECT_STANDARD_MAP: Record<string, string[]> = {
  TAM: [...STANDARDS],
  ENG: [...STANDARDS],
  MAT: [...STANDARDS],
  SCI: ['6', '7', '8', '9', '10'],
  SS: ['6', '7', '8', '9', '10'],
  PHY: ['11', '12'],
  CHE: ['11', '12'],
  BIO: ['11', '12'],
  BOT: ['11', '12'],
  ZOO: ['11', '12'],
  CS: ['11', '12'],
  CA: ['11', '12'],
  BM: ['11', '12'],
  ECO: ['11', '12'],
  COM: ['11', '12'],
  ACC: ['11', '12'],
  HIS: ['11', '12'],
};

export const SCHOOL_TYPES = [
  'Govt. School', 'Govt. Aided School', 'Matriculation School',
  'Corporation School', 'CBSE School',
];

export const FOLLOWUP_STATUS_COLORS: Record<string, string> = {
  Pending:     'bg-amber-100 text-amber-700',
  Processing:  'bg-brand-100 text-brand-700',
  Informed:    'bg-brand-100 text-brand-700',
  Completed:   'bg-emerald-100 text-emerald-700',
  'No Answer': 'bg-ink-100 text-ink-500',
};

export const DISPATCH_STATUS_COLORS: Record<string, string> = {
  Dispatched: 'bg-brand-100 text-brand-700',
  Delivered:  'bg-emerald-100 text-emerald-700',
  Returned:   'bg-rose-100 text-rose-600',
};
