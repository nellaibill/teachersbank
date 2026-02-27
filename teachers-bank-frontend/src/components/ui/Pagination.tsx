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
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between pt-3 border-t border-ink-100">
      <p className="text-xs text-ink-500">
        Showing <span className="font-semibold">{from}–{to}</span> of <span className="font-semibold">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="btn-icon btn-ghost btn-sm disabled:opacity-30">
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
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="btn-icon btn-ghost btn-sm disabled:opacity-30">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
