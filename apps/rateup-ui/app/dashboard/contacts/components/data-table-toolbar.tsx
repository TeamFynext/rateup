"use client";

import { useDisclosure } from "@mantine/hooks";
import { Table } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { CustomFieldForm } from "@/components/Contacts/label-form";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: Readonly<DataTableToolbarProps<TData>>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search custom fields..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="pl-8 w-[250px] lg:w-[300px]"
          />
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <AddCustomField />
      </div>
    </div>
  );
}

const AddCustomField = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const t = useTranslations();

  return (
    <>
      <Button size="sm" onClick={toggle}>
        {t("Add Custom Field")}
      </Button>
      <Dialog open={opened} onOpenChange={toggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Add Custom Field")}</DialogTitle>
          </DialogHeader>
          <CustomFieldForm close={close} />
        </DialogContent>
      </Dialog>
    </>
  );
};
