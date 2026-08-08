"use client";

import * as React from "react";

import { PiCaretDoubleLeft, PiCaretDoubleRight, PiCaretLeft, PiCaretRight } from "react-icons/pi";

/**
 * Storefront pager (reference/Collections Details.png, Product Search.png).
 *
 * Distinct from `@/components/pagination`, which is the admin's arrows-and-pills bar.
 * This one adds first/last jumps and renders as outlined squares, matching the
 * `« ‹ 1 2 3 … 10 › »` control in the mockups.
 */
export const StorePagination = ({ page, totalPages, onChange, className }: { page: number; totalPages: number; onChange: (page: number) => void; className?: string }) => {
  const pages = React.useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const items: (number | "gap")[] = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push("gap");
    for (let index = start; index <= end; index++) items.push(index);
    if (end < totalPages - 1) items.push("gap");

    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const box = "grid size-9 place-items-center border text-sm transition-colors";
  const idle = `${box} border-primary/40 text-primary hover:bg-primary hover:text-light`;
  const disabled = `${box} border-border text-body/30 cursor-not-allowed`;

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1.5 ${className ?? ""}`}>
      <button type="button" onClick={() => onChange(1)} disabled={page === 1} aria-label="First page" className={page === 1 ? disabled : idle}>
        <PiCaretDoubleLeft className="size-3.5" />
      </button>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page" className={page === 1 ? disabled : idle}>
        <PiCaretLeft className="size-3.5" />
      </button>

      {pages.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className={`${box} border-primary/40 text-primary`}>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={item === page ? `${box} border-primary bg-primary text-light` : idle}
          >
            {item}
          </button>
        ),
      )}

      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages} aria-label="Next page" className={page === totalPages ? disabled : idle}>
        <PiCaretRight className="size-3.5" />
      </button>
      <button type="button" onClick={() => onChange(totalPages)} disabled={page === totalPages} aria-label="Last page" className={page === totalPages ? disabled : idle}>
        <PiCaretDoubleRight className="size-3.5" />
      </button>
    </nav>
  );
};
