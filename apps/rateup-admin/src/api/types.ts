/** Every list endpoint of /api/staff answers in this shape. */
export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Dates arrive as ISO strings over JSON. */
export type IsoDate = string;
