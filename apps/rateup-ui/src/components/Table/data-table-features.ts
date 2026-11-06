import type { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_inDateRange,
  filterFn_includesString,
  filterFn_inNumberRange,
  filterFn_weakEquals,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

/** The extra column metadata the tables set. */
interface DataTableColumnMeta {
  /** Human-readable column name the view-options menu shows when the header is a component. */
  title?: string;
  type?: string;
  /** Renders the column's filter control in the table toolbar. */
  filterComponent?: (setFilterValue: (value: unknown) => void) => ReactNode;
}

/**
 * Every feature `<DataTable />` uses. v9 tree-shakes anything not listed, including the built-in
 * filter and sort functions, and a column's `"auto"` filter/sort only resolves to registered
 * ones. No column names a function by string, so these are exactly the ones `"auto"` can pick
 * (`sortFn_basic` is its built-in fallback and needs no entry).
 */
export const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    inDateRange: filterFn_inDateRange,
    includesString: filterFn_includesString,
    inNumberRange: filterFn_inNumberRange,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: metaHelper<DataTableColumnMeta>(),
  /** What the survey `fuzzyFilter` records per row via `addMeta`. */
  filterMeta: metaHelper<{ itemRank?: RankingInfo }>(),
});

/** Pass as the first generic of `ColumnDef`, `Column`, `ReactTable` and `Row`. */
export type DataTableFeatures = typeof features;
