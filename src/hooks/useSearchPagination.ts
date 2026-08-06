"use client";

import * as React from "react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type ViewMode = "grid" | "list";

interface SearchPaginationOptions {
  /** Query-string keys this screen treats as filters, e.g. ["status", "branding"]. */
  filterKeys?: readonly string[];
  defaultView?: ViewMode;
  defaultLimit?: number;
}

interface SearchPaginationResult {
  /** Committed search term — read from the URL, never from local state. */
  searchQuery: string;
  /** Uncommitted draft the input is bound to. */
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSearch: () => void;
  handleClearSearch: () => void;

  page: number;
  limit: number;
  handlePageChange: (page: number) => void;

  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetAll: () => void;
  hasFilters: boolean;

  view: ViewMode;
  setView: (view: ViewMode) => void;
}

/**
 * The URL is the single source of truth for search, filters, paging and view mode,
 * so a list screen is shareable and survives a refresh or a back button.
 *
 * v1 mirrored every param into React state inside an effect, which is both a render
 * behind the URL and the `react-hooks/set-state-in-effect` lint error in this file.
 * Everything except the uncommitted search draft is now derived during render; the
 * draft resyncs using the documented "adjust state when a prop changes" pattern
 * rather than an effect.
 */
export const useSearchPagination = (options?: SearchPaginationOptions): SearchPaginationResult => {
  const { filterKeys = [], defaultView = "list", defaultLimit = 10 } = options ?? {};

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchQuery = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || defaultLimit;
  const view: ViewMode = searchParams.get("view") === "grid" ? "grid" : searchParams.get("view") === "list" ? "list" : defaultView;

  const [inputValue, setInputValue] = React.useState<string>(searchQuery);
  const [syncedSearch, setSyncedSearch] = React.useState<string>(searchQuery);

  // Back/forward navigation changes the URL without a re-mount; pull the draft along
  // with it during render so the box never shows a stale term.
  if (searchQuery !== syncedSearch) {
    setSyncedSearch(searchQuery);
    setInputValue(searchQuery);
  }

  const filterKey = filterKeys.join(",");
  const filters = React.useMemo(() => {
    const entries = filterKey ? filterKey.split(",") : [];
    return Object.fromEntries(entries.map((key) => [key, searchParams.get(key) ?? ""]));
  }, [filterKey, searchParams]);

  const pushParams = React.useCallback(
    (updates: Record<string, string>, { replace = false }: { replace?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });

      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      if (replace) router.replace(url, { scroll: false });
      else router.push(url);
    },
    [searchParams, pathname, router],
  );

  const handleSearch = React.useCallback(() => pushParams({ search: inputValue, page: "" }), [inputValue, pushParams]);

  const handleClearSearch = React.useCallback(() => {
    setInputValue("");
    pushParams({ search: "", page: "" });
  }, [pushParams]);

  // Any filter change resets to page 1 — page 4 of the old result set is rarely a
  // valid page of the new one, and an empty screen reads as "no results".
  const setFilter = React.useCallback((key: string, value: string) => pushParams({ [key]: value, page: "" }), [pushParams]);

  const handlePageChange = React.useCallback((next: number) => pushParams({ page: next <= 1 ? "" : String(next) }), [pushParams]);

  const setView = React.useCallback((next: ViewMode) => pushParams({ view: next }, { replace: true }), [pushParams]);

  // Keyed off the joined string, not the array: callers pass `filterKeys` inline, so a
  // dependency on the array itself would rebuild this callback on every render.
  const resetAll = React.useCallback(() => {
    setInputValue("");
    const cleared = filterKey ? Object.fromEntries(filterKey.split(",").map((key) => [key, ""])) : {};
    pushParams({ search: "", page: "", ...cleared });
  }, [pushParams, filterKey]);

  const hasFilters = Boolean(searchQuery) || Object.values(filters).some(Boolean);

  return { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters, view, setView };
};
