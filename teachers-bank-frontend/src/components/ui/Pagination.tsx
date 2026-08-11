'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  if (totalPages <= 1) return null;
  const pages: (number | '...')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');

    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-ink-100 flex-wrap">
      <p className="text-sm text-ink-600">displaying page</p>
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onChange(1)}
          disabled={page === 1}
          className="btn-ghost btn btn-sm disabled:opacity-40"
        >
          First
        </button>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="btn-icon btn-ghost btn-sm disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) => (
          <button key={i}
            onClick={() => typeof p === 'number' && onChange(p)}
            disabled={p === '...'}
            className={cn(
              'w-7 h-7 text-xs rounded-lg font-medium transition-colors',
              p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100',
              p === '...' && 'cursor-default'
            )}>
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="btn-icon btn-ghost btn-sm disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => onChange(totalPages)}
          disabled={page === totalPages}
          className="btn-ghost btn btn-sm disabled:opacity-40"
        >
          Last
        </button>
      </div>
      <p className="text-sm text-ink-600">
        {page.toLocaleString()} of <span className="font-semibold text-brand-600">{totalPages.toLocaleString()}</span>
        <span className="text-ink-400"> ({total.toLocaleString()} records, {limit}/page)</span>
      </p>
    </div>
  );
}
