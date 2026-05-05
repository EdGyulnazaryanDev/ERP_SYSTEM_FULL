export class BasePaginationDto {
  page?: number = 1;
  limit?: number = 50;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
