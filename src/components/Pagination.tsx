import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-3 px-4.5 py-3 border-t border-neutral-200 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400">
      <span>
        Mostrando {start}–{end} de {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <ChevronLeft size={14} />
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-neutral-300 dark:border-white/20 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-white/5"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
