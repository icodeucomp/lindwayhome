"use client";

import * as React from "react";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface SearchPaginationOptions {
  defaultPage?: number;
  searchParamName?: string;
  pageParamName?: string;
  categoryParamName?: string;
}

interface SearchPaginationResult {
  searchQuery: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSearch: () => void;
  currentPage: number;
  handlePageChange: (newPage: number) => void;
  selectedCategory: string;
  handleCategoryChange: (category: string) => void;
}

export const useSearchPagination = (options?: SearchPaginationOptions): SearchPaginationResult => {
  const { defaultPage = 1, searchParamName = "search", pageParamName = "page", categoryParamName = "category" } = options || {};

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [selectedCategory, setSelectedCategory] = React.useState<string>("");

  const currentPage = Number(searchParams.get(pageParamName)) || defaultPage;

  const [inputValue, setInputValue] = React.useState<string>("");

  React.useEffect(() => {
    const queryFromUrl = searchParams.get(searchParamName) || "";
    const categoryFromUrl = searchParams.get(categoryParamName) || "";
    setSearchQuery(queryFromUrl);
    setInputValue(queryFromUrl);
    setSelectedCategory(categoryFromUrl);
  }, [searchParams, searchParamName, categoryParamName]);

  const updateSearchParams = React.useCallback(
    (updates: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });

      const newUrl = `${pathname}?${newParams.toString()}`;
      router.push(newUrl);
    },
    [searchParams, pathname, router]
  );

  const handleSearch = React.useCallback(() => {
    updateSearchParams({
      [searchParamName]: inputValue,
      [pageParamName]: String(defaultPage),
    });
    setSearchQuery(inputValue);
  }, [inputValue, defaultPage, searchParamName, pageParamName, updateSearchParams]);

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      updateSearchParams({
        [pageParamName]: String(newPage),
      });
    },
    [pageParamName, updateSearchParams]
  );

  const handleCategoryChange = React.useCallback(
    (category: string) => {
      updateSearchParams({
        [categoryParamName]: category,
        [pageParamName]: String(defaultPage),
      });
      setSelectedCategory(category);
    },
    [categoryParamName, pageParamName, defaultPage, updateSearchParams]
  );

  return {
    searchQuery,
    inputValue,
    setInputValue,
    handleSearch,
    currentPage,
    handlePageChange,
    selectedCategory,
    handleCategoryChange,
  };
};
