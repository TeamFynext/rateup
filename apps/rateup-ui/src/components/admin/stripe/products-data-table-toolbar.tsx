import { IconRefresh, IconX } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";

import { useSyncStripeProducts } from "@/backend/payment/stripe/stripe.query";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function ProductsDataTableToolbar<TData>({ table }: Readonly<DataTableToolbarProps<TData>>) {
  const syncStripeProductMutate = useSyncStripeProducts();
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter by product name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            table.getColumn("name")?.setFilterValue(value);
          }}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
            Reset
            <IconX />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncStripeProductMutate.mutate()}
          loading={syncStripeProductMutate.isPending}
        >
          <IconRefresh
            className={`h-4 w-4 mr-2 ${syncStripeProductMutate.isPending ? "animate-spin" : ""}`}
          />
          Sync Products
        </Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
