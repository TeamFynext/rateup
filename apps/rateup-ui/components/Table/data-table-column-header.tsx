import { Button, Group, Menu, Text } from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconEyeOff,
  IconSelector,
} from "@tabler/icons-react";
import { Column } from "@tanstack/react-table";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: Readonly<DataTableColumnHeaderProps<TData, TValue>>) {
  if (!column.getCanSort()) {
    return <Text className={className}>{title}</Text>;
  }

  return (
    <Group gap="xs" className={className}>
      <Menu position="bottom-start">
        <Menu.Target>
          <Button
            variant="subtle"
            size="compact-sm"
            color="light-dark('black', 'white')"
            pl={0}
            fw={500}
            rightSection={
              column.getIsSorted() === "desc" ? (
                <IconArrowDown size={16} />
              ) : column.getIsSorted() === "asc" ? (
                <IconArrowUp size={16} />
              ) : (
                <IconSelector size={16} />
              )
            }
          >
            {title}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconArrowUp size={16} />}
            onClick={() => column.toggleSorting(false)}
          >
            Asc
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowDown size={16} />}
            onClick={() => column.toggleSorting(true)}
          >
            Desc
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconEyeOff size={16} />}
            onClick={() => column.toggleVisibility(false)}
          >
            Hide
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
