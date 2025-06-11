"use client";

import { Button, Flex, Group, TextInput } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";

import { DataTableFacetedFilter } from "@/components/Table/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";

import { priorities, statuses } from "./data/data";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <Flex justify="space-between" align="center">
      <Flex align="center" gap="sm" style={{ flex: 1 }}>
        <TextInput
          placeholder="Filter tasks..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.currentTarget.value)
          }
          size="sm"
          style={{ width: 250 }}
        />
        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="Status"
            options={statuses}
          />
        )}
        {table.getColumn("priority") && (
          <DataTableFacetedFilter
            column={table.getColumn("priority")}
            title="Priority"
            options={priorities}
          />
        )}
        {isFiltered && (
          <Button
            variant="subtle"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            rightSection={<IconX size={16} />}
          >
            Reset
          </Button>
        )}
      </Flex>
      <Group gap="sm">
        <DataTableViewOptions table={table} />
        <Button size="sm">Add Task</Button>
      </Group>
    </Flex>
  );
}
