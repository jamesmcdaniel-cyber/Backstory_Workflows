import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

// Page navigation for the catalogue grids. Mirrors the ToggleGroup pill styling
// so the filters and the pager read as one control language. Renders nothing
// when a single page holds everything.
const pill =
  'inline-flex items-center justify-center rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-medium transition-colors cursor-pointer';

export function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const go = (p) => onPageChange(Math.min(Math.max(p, 1), pageCount));

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={cn(
          pill,
          'gap-1 border-ac-light-gray bg-ac-card text-ac-dark-secondary hover:border-ac-coral hover:text-ac-coral-dark',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ac-light-gray disabled:hover:text-ac-dark-secondary',
        )}
      >
        <ChevronLeft size={14} />
        Prev
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => go(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(
            pill,
            'min-w-[2.25rem] tabular-nums',
            p === page
              ? 'border-ac-coral bg-ac-coral text-ac-ink'
              : 'border-ac-light-gray bg-ac-card text-ac-dark-secondary hover:border-ac-coral hover:text-ac-coral-dark',
          )}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className={cn(
          pill,
          'gap-1 border-ac-light-gray bg-ac-card text-ac-dark-secondary hover:border-ac-coral hover:text-ac-coral-dark',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ac-light-gray disabled:hover:text-ac-dark-secondary',
        )}
      >
        Next
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
