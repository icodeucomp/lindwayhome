"use client";

import { useMemo } from "react";

import { PiCaretLeftThin, PiCaretRightThin } from "react-icons/pi";

import { PaginationProps } from "@/types";

export const Pagination = ({ setPage, page, totalPage, isNumber = false }: PaginationProps) => {
  const maxVisiblePages = 3;

  const updatePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleNextPage = () => {
    updatePage(Math.min(page + 1, totalPage));
  };

  const handlePreviousPage = () => {
    updatePage(Math.max(page - 1, 1));
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const half = Math.floor(maxVisiblePages / 2);

    pages.push(1);
    if (page > half + 2) pages.push("...");

    const start = Math.max(2, page - half);
    const end = Math.min(totalPage - 1, page + half);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page + half < totalPage - 1) pages.push("...");
    if (totalPage > 1) pages.push(totalPage);

    return pages;
  }, [page, totalPage]);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {/* Previous button */}
      <button
        className={`size-10 sm:size-12 flex items-center justify-center border rounded-lg bg-light duration-300 group ${page === 1 ? "border-gray" : `border-blue-600 hover:bg-blue-700`}`}
        type="button"
        onClick={handlePreviousPage}
        disabled={page === 1}
      >
        <PiCaretLeftThin size={24} className={`duration-300 ${page === 1 ? "fill-gray" : `fill-blue-600 group-hover:fill-light`}`} />
      </button>

      {/* Pagination with ellipses */}
      {isNumber &&
        pageNumbers.map((numberPage, index) =>
          typeof numberPage === "number" ? (
            <button
              key={index}
              type="button"
              onClick={() => setPage(numberPage)}
              className={`pagination-number ${numberPage === page ? `bg-blue-600 text-light` : "bg-light text-gray hover:border-blue-700"}`}
            >
              {numberPage}
            </button>
          ) : (
            <span key={index} className="p-0 sm:p-1 text-3xl text-gray">
              {numberPage}
            </span>
          )
        )}

      {/* Next button */}
      <button
        className={`size-10 sm:size-12 flex items-center justify-center border rounded-lg bg-light duration-300 group ${page === totalPage ? "border-gray" : `border-blue-600 hover:bg-blue-700`}`}
        type="button"
        onClick={handleNextPage}
        disabled={page === totalPage}
      >
        <PiCaretRightThin size={24} className={`duration-300 ${page === totalPage ? "fill-gray" : `fill-blue-600 group-hover:fill-light`}`} />
      </button>
    </div>
  );
};
