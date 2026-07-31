import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  /**
   * The extra column metadata the tables set. `title` is the human-readable column name the
   * view-options menu shows when the header is a component rather than a string.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    title?: string;
    type?: string;
  }
}
