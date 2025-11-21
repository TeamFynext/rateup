import { useState } from "react";

import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { Table } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { CustomFieldForm } from "@/components/Contacts/label-form";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [isOpenedAddModal, setIsOpenedAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const t = useTranslations();
  return (
    <Card className="p-4 my-2">
      <div className="flex justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by field name..."
              className="pl-10 placeholder:text-sm bg-gray-100 border-none"
              value={
                (table.getColumn("name")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
            />
          </div>
          <Button
            variant="default"
            className="bg-rateup-blue"
            size="sm"
            onClick={() => setIsOpenedAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="font-medium text-sm">{t("Add Custom Field")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <AddLabels
            opened={isOpenedAddModal}
            setOpened={setIsOpenedAddModal}
          />
          <DataTableViewOptions table={table} />
        </div>
      </div>
    </Card>
  );
}

const AddLabels = ({ opened, setOpened }) => {
  const t = useTranslations();

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Add Custom Field")}</DialogTitle>
          <DialogDescription>
            {t(
              "Create a custom field to store additional information about your contacts.",
            )}
          </DialogDescription>
        </DialogHeader>
        <CustomFieldForm onSubmitCallback={() => setOpened(false)} />
      </DialogContent>
    </Dialog>
  );
};
