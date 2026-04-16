/**
 * Reusable pagination hook and component for ERP-style tables.
 */
'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const next = () => goTo(page + 1);
  const prev = () => goTo(page - 1);
  const reset = () => setPage(1);

  return { page, totalPages, paged, next, prev, goTo, reset, total: items.length, pageSize };
}

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (p: number) => void;
}

export function PaginationBar({ page, totalPages, total, pageSize, onNext, onPrev, onGoTo }: PaginationBarProps) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page numbers to show
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 border-t border-border mt-2">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of <span className="font-medium text-foreground">{total}</span> records
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="p-1.5 rounded-md border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onGoTo(p as number)}
              className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-colors border ${
                p === page
                  ? 'bg-primary text-white border-primary' :'bg-white border-border hover:bg-muted text-foreground'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="p-1.5 rounded-md border border-border bg-white hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
