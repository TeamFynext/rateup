import { ActionIcon, Button, Group, Select, Text } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <Group justify="space-between" p="sm">
      <Text size="sm" c="dimmed">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </Text>
      <Group gap="lg">
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Rows per page
          </Text>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onChange={(value) => {
              if (value) table.setPageSize(Number(value));
            }}
            data={["10", "20", "25", "30", "40", "50"]}
            w={70}
            size="xs"
          />
        </Group>
        <Text size="sm" fw={500} w={100} ta="center">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </Text>
        <Group gap="xs">
          <ActionIcon
            variant="outline"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            visibleFrom="lg"
          >
            <IconChevronsLeft size={16} />
          </ActionIcon>
          <ActionIcon
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
          <ActionIcon
            variant="outline"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            visibleFrom="lg"
          >
            <IconChevronsRight size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Group>
  );
}
