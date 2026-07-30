/**
 * Shared shapes for the `src/backend` API/query layer.
 *
 * These endpoints are untyped on the wire (the API has no generated client), so
 * request payloads are modelled as `unknown` — accurate, and still assignable
 * from any caller-supplied object — while query-string filters get a concrete
 * serialisable record type.
 */

/** A value that can be serialised into a query string. */
export type QueryParamValue = string | number | boolean | Date | null | undefined;

/** Filter object that gets flattened into a query string via `Object.entries`. */
export type QueryFilter = Record<string, QueryParamValue>;

/** Request body forwarded verbatim to axios. */
export type RequestPayload = unknown;

/** TanStack Table pagination state, as consumed by the paginated list endpoints. */
export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

/** Single-column sort state used by the paginated list endpoints. */
export type SortState = {
  id: string;
  desc: boolean;
};

/** Column filter entry flattened into the query string by the list endpoints. */
export type ColumnFilterState = {
  id: string;
  value: string;
};

/** Analytics date-range selection shared by the analytics dashboards. */
export type AnalyticsDateRange = {
  key: string;
  range: Date[];
};
