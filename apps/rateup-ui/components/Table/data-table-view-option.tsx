"use client";

import { Button, Checkbox, Divider, Menu, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";

export function DataTableViewOptions<TData>({
  table,
}: {
  table: Table<TData>;
}) {
  return (
    <Menu position="bottom-end" width={150}>
      <Menu.Target>
        <Button
          variant="outline"
          size="sm"
          leftSection={<IconAdjustmentsHorizontal size={16} />}
          className="ml-auto hidden h-8 lg:flex"
        >
          View
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500}>
            Toggle columns
          </Text>
        </Menu.Label>
        <Divider />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide(),
          )
          .map((column) => {
            return (
              <Menu.Item key={column.id} closeMenuOnClick={false}>
                <Checkbox
                  label={column.id}
                  checked={column.getIsVisible()}
                  onChange={(event) =>
                    column.toggleVisibility(event.currentTarget.checked)
                  }
                  styles={{
                    label: { textTransform: "capitalize" },
                  }}
                />
              </Menu.Item>
            );
          })}
      </Menu.Dropdown>
    </Menu>
  );
}
