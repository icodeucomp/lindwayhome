"use client";

import * as React from "react";

import { PiCaretDown, PiCaretDoubleLeft, PiCaretDoubleRight, PiCaretLeft, PiCaretRight, PiCheck, PiMagnifyingGlass, PiRows, PiSquaresFour, PiX } from "react-icons/pi";

import type { ViewMode } from "@/hooks";

/* -------------------------------------------------------------------------- */
/*                              Dismissable popover                           */
/*                                                                            */
/* Local rather than the shared useToggleState, which force-closes whenever the*/
/* lg breakpoint changes — correct for a mobile nav, wrong for a filter menu.  */
/* -------------------------------------------------------------------------- */

const useDismissable = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return { ref, isOpen, toggle: () => setIsOpen((open) => !open), close: () => setIsOpen(false) };
};

/* -------------------------------------------------------------------------- */
/*                                   Toolbar                                  */
/* -------------------------------------------------------------------------- */

export const ListToolbar = ({ children }: { children: React.ReactNode }) => <div className="pb-4 mb-6 space-y-4 border-b border-border">{children}</div>;

/** Row holding the filter dropdowns on the left and the view toggle on the right. */
export const ToolbarRow = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">{children}</div>;

export const FilterRow = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div>;

/* -------------------------------------------------------------------------- */
/*                                   Search                                   */
/* -------------------------------------------------------------------------- */

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export const SearchBar = ({ value, placeholder = "Search…", onChange, onSearch, onClear }: SearchBarProps) => (
  <div className="flex max-w-md">
    <div className="relative flex-1">
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSearch();
          }
        }}
        className="pr-9 input-form rounded-r-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={onClear} aria-label="Clear search" className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-body/35 hover:text-body">
          <PiX className="size-3.5" />
        </button>
      )}
    </div>
    <button
      type="button"
      onClick={onSearch}
      aria-label="Search"
      className="grid px-3.5 border border-l-0 rounded-sm rounded-l-none cursor-pointer border-border place-items-center text-body/60 hover:text-primary hover:border-primary duration-200"
    >
      <PiMagnifyingGlass className="size-4" />
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Filters                                  */
/*                                                                            */
/* Rendered as inline text ("STATUS  ALL ▾") rather than boxed selects, so a   */
/* row of four filters reads as one line of type instead of four widgets.      */
/* -------------------------------------------------------------------------- */

export interface FilterOption {
  value: string;
  label: string;
}

export const FilterDropdown = ({ label, value, options, onChange }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void }) => {
  const { ref, isOpen, toggle, close } = useDismissable();
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-2 font-heading text-xxs font-semibold uppercase tracking-[0.14em] cursor-pointer group"
      >
        <span className="text-body/45">{label}</span>
        <span className={`duration-200 ${value ? "text-primary" : "text-body"} group-hover:text-primary`}>{selected?.label ?? "All"}</span>
        <PiCaretDown className={`size-3 duration-200 text-body/45 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <ul role="listbox" className="absolute left-0 z-50 py-1 mt-2 border rounded-sm shadow-lg min-w-44 border-border bg-light">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className={`flex items-center justify-between w-full gap-3 px-3 py-2 text-left text-sm duration-200 cursor-pointer hover:bg-muted ${option.value === value ? "text-body" : "text-body/65"}`}
              >
                {option.label}
                {option.value === value && <PiCheck className="size-3.5 text-primary shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 View toggle                                */
/* -------------------------------------------------------------------------- */

export const ViewToggle = ({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) => (
  <div className="flex items-center gap-1">
    {(
      [
        { mode: "grid" as const, icon: PiSquaresFour, label: "Grid view" },
        { mode: "list" as const, icon: PiRows, label: "List view" },
      ] satisfies { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[]
    ).map(({ mode, icon: Icon, label }) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        aria-label={label}
        aria-pressed={view === mode}
        className={`grid size-8 rounded-sm place-items-center duration-200 cursor-pointer ${view === mode ? "text-primary bg-primary/10" : "text-body/35 hover:text-body"}`}
      >
        <Icon className="size-4.5" />
      </button>
    ))}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                 Pagination                                 */
/* -------------------------------------------------------------------------- */

const buildPages = (page: number, totalPages: number): (number | "gap")[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push("gap");
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < totalPages - 1) pages.push("gap");

  pages.push(totalPages);
  return pages;
};

interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const DataPagination = ({ page, totalPages, total, limit, onPageChange }: DataPaginationProps) => {
  if (totalPages <= 0 || total === 0) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-4 pt-6 mt-8 border-t border-border sm:flex-row">
      <p className="text-xs text-body/50">
        Showing <span className="text-body">{from}</span>–<span className="text-body">{to}</span> of <span className="text-body">{total}</span>
      </p>

      <div className="pagination-root">
        <button type="button" onClick={() => onPageChange(1)} disabled={isFirst} aria-label="First page" className={`pagination-arrow ${isFirst ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}>
          <PiCaretDoubleLeft className="size-4" />
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={isFirst} aria-label="Previous page" className={`pagination-arrow ${isFirst ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}>
          <PiCaretLeft className="size-4" />
        </button>

        <div className="pagination-numbers">
          {buildPages(page, totalPages).map((entry, index) =>
            entry === "gap" ? (
              <span key={`gap-${index}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button key={entry} type="button" onClick={() => onPageChange(entry)} aria-current={entry === page ? "page" : undefined} className={`pagination-pill ${entry === page ? "pagination-pill--active" : "pagination-pill--idle"}`}>
                {entry}
              </button>
            ),
          )}
        </div>

        <button type="button" onClick={() => onPageChange(page + 1)} disabled={isLast} aria-label="Next page" className={`pagination-arrow ${isLast ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}>
          <PiCaretRight className="size-4" />
        </button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={isLast} aria-label="Last page" className={`pagination-arrow ${isLast ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}>
          <PiCaretDoubleRight className="size-4" />
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                Result summary                              */
/* -------------------------------------------------------------------------- */

export const ResultCount = ({ total, noun, filtered }: { total: number; noun: string; filtered?: boolean }) => (
  <p className="text-xs text-body/50">
    {total} {noun}
    {total === 1 ? "" : "s"} {filtered ? "matching your filters" : "total"}
  </p>
);
