"use client";

import { useMemo } from "react";
import { PiCaretLeftThin, PiCaretRightThin } from "react-icons/pi";
import { PaginationProps } from "@/types";

export const Pagination = ({ setPage, page, totalPage, isNumber = false }: PaginationProps) => {
  const maxVisiblePages = 5;

  const updatePage = (newPage: number) => setPage(newPage);
  const handleNextPage = () => updatePage(Math.min(page + 1, totalPage));
  const handlePreviousPage = () => updatePage(Math.max(page - 1, 1));

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisiblePages / 2);

    if (totalPage <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPage; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (page > half + 2) pages.push("…");

    const start = Math.max(2, page - half);
    const end = Math.min(totalPage - 1, page + half);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page + half < totalPage - 1) pages.push("…");
    if (totalPage > 1) pages.push(totalPage);

    return pages;
  }, [page, totalPage]);

  const isFirst = page === 1;
  const isLast = page === totalPage;

  return (
    <div className="pagination-root">
      {/* Previous */}
      <button
        type="button"
        onClick={handlePreviousPage}
        disabled={isFirst}
        aria-label="Previous page"
        className={`pagination-arrow ${isFirst ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}
      >
        <PiCaretLeftThin size={20} />
      </button>

      {/* Number pills */}
      {isNumber && (
        <div className="pagination-numbers">
          {pageNumbers.map((numberPage, index) =>
            typeof numberPage === "number" ? (
              <button
                key={index}
                type="button"
                onClick={() => setPage(numberPage)}
                aria-current={numberPage === page ? "page" : undefined}
                className={`pagination-pill ${numberPage === page ? "pagination-pill--active" : "pagination-pill--idle"}`}
              >
                {numberPage}
              </button>
            ) : (
              <span key={index} className="pagination-ellipsis">
                {numberPage}
              </span>
            ),
          )}
        </div>
      )}

      {/* Next */}
      <button type="button" onClick={handleNextPage} disabled={isLast} aria-label="Next page" className={`pagination-arrow ${isLast ? "pagination-arrow--disabled" : "pagination-arrow--active"}`}>
        <PiCaretRightThin size={20} />
      </button>
    </div>
  );
};
