import { useState, useCallback } from 'react';
import type { FilterOperator, SortOption, QueryParams } from '@/services/BaseService';

export function useDataTable(initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<FilterOperator[]>([]);
  const [sort, setSort] = useState<SortOption[]>([]);
  const [search, setSearch] = useState('');

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterOperator[]) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSortChange = useCallback((newSort: SortOption[]) => {
    setSort(newSort);
  }, []);

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page when search changes
  }, []);

  const resetFilters = useCallback(() => {
    setFilters([]);
    setSort([]);
    setSearch('');
    setPage(1);
  }, []);

  const queryParams: QueryParams = {
    page,
    pageSize,
    filters,
    sort,
    search,
  };

  return {
    page,
    pageSize,
    filters,
    sort,
    search,
    queryParams,
    handlePageChange,
    handleFilterChange,
    handleSortChange,
    handleSearchChange,
    resetFilters,
  };
}
