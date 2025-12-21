import { useState } from "react";

import { notifications } from "@mantine/notifications";
import { IconFilter, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";
import { DataTableViewOptions } from "@/components/Table/data-table-view-option";
import { Filter } from "@/components/Table/Filter/Filter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUser } from "@/context/UserContext";

import { useResponseFilterStore } from "./store";

function DataTableToolbar({
  table,
  columnFilters,
  refetchResponse,
  deleteResponse,
}) {
  const { user } = useUser();
  const translations = useTranslations();
  const { setServerFilters } = useResponseFilterStore();

  const [opened, setOpened] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const filterableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getCanFilter() && col.id !== "action");

  function handleApplyFilters() {
    setServerFilters(
      columnFilters.reduce((acc, c) => {
        if (!c.value || c.value.length === 0) return acc;

        const id = c.id.includes("_,_") ? c.id.split("_,_").pop() : c.id;
        acc[id] = c.value;
        return acc;
      }, {}),
    );
  }

  function handleClearFilters() {
    table.resetColumnFilters();
    setServerFilters({});
  }

  function openDeleteModal() {
    setVerifyEmail("");
    setOpened(true);
  }

  function closeDeleteModal() {
    setOpened(false);
    setVerifyEmail("");
  }

  function confirmDelete() {
    const selectedIds = Object.keys(table.getState().rowSelection);

    if (user?.email !== verifyEmail) {
      notifications.show({
        color: "red",
        title: translations("Error"),
        message: translations("Incorrect email"),
        icon: <IconX size="1rem" />,
      });
      return;
    }

    notifications.show({
      id: "delete-response",
      loading: true,
      title: translations("Deleting Response"),
      message: translations("Hold on, response is getting deleted"),
      autoClose: false,
      withCloseButton: false,
    });

    setIsDeleting(true);

    deleteResponse.mutate(selectedIds, {
      onSuccess: () => {
        notifications.update({
          id: "delete-response",
          color: "green",
          title: translations("Success"),
          message: translations("Response deleted successfully"),
          autoClose: 3000,
        });
        table.resetRowSelection();
        refetchResponse();
        closeDeleteModal();
      },
      onError: () => {
        notifications.update({
          id: "delete-response",
          color: "red",
          title: translations("Error"),
          message: translations("Failed to delete response"),
          autoClose: 3000,
        });
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 justify-end p-2">
        <DataTableViewOptions table={table} />

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <IconFilter className="mr-2 h-3 w-3" />
              {translations("Filters")}
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[420px] rounded-xl p-4">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-1">
                <IconFilter className="h-4 w-4" />
                {translations("Filters")}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4">
              {filterableColumns.map((col) => (
                <div key={col.id}>
                  <label className="text-sm font-medium">
                    {col.id?.split("_,_")?.[0]}
                  </label>
                  <Filter column={col} table={table} />
                </div>
              ))}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
              <Button variant="ghost" onClick={handleClearFilters}>
                {translations("Clear")}
              </Button>
              <Button onClick={handleApplyFilters}>
                {translations("Apply Filters")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {Object.keys(table.getState().rowSelection).length > 0 && (
          <Button variant="destructive" onClick={openDeleteModal}>
            {translations("Delete")}
          </Button>
        )}
      </div>

      <FormModalLayout
        opened={opened}
        onClose={closeDeleteModal}
        title={translations("Delete Response")}
        centered
        buttonTitle={translations("Delete")}
        includeCancelButton
        onSubmit={confirmDelete}
      >
        <div className="py-4 space-y-3">
          <p>{translations("To proceed further, verify your email id")}</p>

          <ContainedTextField
            withAsterisk
            label={translations("Verify email")}
            placeholder={translations("Enter your login email")}
            required
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
          />

          <p className="text-red-500 text-sm">
            {translations("Once deleted, response entry data will be lost")}
          </p>
        </div>
      </FormModalLayout>
    </>
  );
}

export default DataTableToolbar;
