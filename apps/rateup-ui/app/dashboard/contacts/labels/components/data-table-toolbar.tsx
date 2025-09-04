"use client";

import { Button, Flex, Group, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { LabelForm } from "@/components/Contacts/label-form";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <Flex justify="space-between" align="center">
      <Flex align="center" gap="sm" style={{ flex: 1 }}>
        <TextInput
          placeholder="Filter labels..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.currentTarget.value)
          }
          size="sm"
          style={{ width: 250 }}
        />
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
        <AddLabels />
      </Group>
    </Flex>
  );
}

const AddLabels = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const t = useTranslations();

  return (
    <>
      <Button size="sm" onClick={toggle}>
        {t("Add Label")}
      </Button>
      <Modal opened={opened} onClose={close} title={t("Add Label")} centered>
        <LabelForm close={close} />
      </Modal>
    </>
  );
};
