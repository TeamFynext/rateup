import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** The column that titles a phone card. Exactly one column should set it. */
  primary?: boolean;
  /** Hidden in the table below this width (it still shows on phone cards). */
  hideBelow?: "lg" | "xl";
  align?: "right";
  className?: string;
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/**
 * One list, two layouts: a table from `md` up and a stack of cards below it, where the
 * primary column titles each card and the rest become label / value pairs. Every list in
 * the console uses it, so none of them scrolls sideways on a phone.
 */
export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  rowLink,
  minWidth = 720,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Makes the whole row (and card) a link. */
  rowLink?: (row: T) => LinkProps;
  /** Below this the table scrolls inside its frame rather than squeezing columns. */
  minWidth?: number;
}) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3.5 font-medium whitespace-nowrap",
                    index === 0 && "pl-6",
                    index === columns.length - 1 && "pr-6",
                    column.align === "right" && "text-right",
                    column.hideBelow && HIDE[column.hideBelow],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const link = rowLink?.(row);
              return (
                <tr
                  key={rowKey(row)}
                  className={cn("transition-colors", link && "relative hover:bg-muted/50")}
                >
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3.5 align-middle",
                        index === 0 && "pl-6",
                        index === columns.length - 1 && "pr-6",
                        column.align === "right" && "text-right",
                        column.hideBelow && HIDE[column.hideBelow],
                        column.className,
                      )}
                    >
                      {index === 0 && link ? (
                        // The first cell's link stretches over the row, so the row is one link.
                        <Link {...link} className="after:absolute after:inset-0">
                          {column.cell(row)}
                        </Link>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const link = rowLink?.(row);
          const body = (
            <>
              <div className="min-w-0">{primary.cell(row)}</div>
              {rest.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {rest.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">{column.header}</dt>
                      <dd className="mt-0.5 min-w-0 text-sm wrap-break-word">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          );
          return (
            <li key={rowKey(row)}>
              {link ? (
                <Link
                  {...link}
                  className="flex flex-col gap-4 rounded-xl border p-5 transition-colors active:bg-muted/50"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl border p-5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
