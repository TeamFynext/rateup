import type { Table } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CustomFieldForm } from "@/components/Contacts/label-form.tsx";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: Readonly<DataTableToolbarProps<TData>>) {
  const [isOpenedAddModal, setIsOpenedAddModal] = useState(false);
  const { t } = useTranslation();
  return (
    <Card className="p-2 mb-4">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by field name..."
              className="pl-10 placeholder:text-sm bg-gray-100 border-none"
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            />
          </div>
          <Button
            variant="default"
            className="bg-primary"
            size="sm"
            onClick={() => setIsOpenedAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">{t("Add Custom Field")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <AddCustomField opened={isOpenedAddModal} setOpened={setIsOpenedAddModal} />
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </Card>
  );
}

const AddCustomField = ({ opened, setOpened }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Add Custom Field")}</DialogTitle>
          <DialogDescription>
            {t("Create a custom field to store additional information about your contacts.")}
          </DialogDescription>
        </DialogHeader>
        <CustomFieldForm onSubmitCallback={() => setOpened(false)} />
      </DialogContent>
    </Dialog>
  );
};
