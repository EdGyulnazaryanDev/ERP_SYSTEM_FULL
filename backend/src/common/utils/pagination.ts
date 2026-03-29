export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function parsePagination(
  page?: string | number,
  limit?: string | number,
  defaultLimit = 50,
): { page: number; limit: number; skip: number } {
  const p = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const l = Math.min(500, Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return { data, total, page, limit };
}
