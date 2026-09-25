import { IconSearch } from "@tabler/icons-react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAddExistingContactMutation,
  useContactGroup,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { FilterSelect } from "@/components/dashboard/contacts/ContactsPage.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";
import ContactPagination from "./ContactPagination.tsx";

/**
 * Picks contacts already in the org and adds them to a group. Members of the group are shown
 * ticked and locked, so the list reads as the whole contact book rather than hiding them.
 */
const AddExistingContacts = ({
  groupId,
  close,
  existingContactIds,
}: {
  groupId: string;
  close: () => void;
  existingContactIds: string[];
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const addExistingContacts = useAddExistingContactMutation(groupId);
  const { isPending, data } = useContacts(pagination, searchTerm, undefined, columnFilters);
  const { data: contactGroups } = useContactGroup();

  const contacts = data?.users ?? [];
  const isMember = (id: string) => existingContactIds.includes(id);
  const selectableIds = contacts.map((contact) => contact.id).filter((id) => !isMember(id));
  const allOnPageSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((other) => other !== id)));
  }

  function togglePage(checked: boolean) {
    setSelectedIds((prev) =>
      checked
        ? [...new Set([...prev, ...selectableIds])]
        : prev.filter((id) => !selectableIds.includes(id)),
    );
  }

  function handleAdd() {
    addExistingContacts.mutate(
      { customerList: selectedIds, groupId },
      {
        onSuccess: () => {
          setSelectedIds([]);
          close();
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <FieldLabel htmlFor="add-existing-search" className="sr-only">
            {t("Search Contact")}
          </FieldLabel>
          <Input
            id="add-existing-search"
            type="search"
            className="border-none bg-muted pl-9 placeholder:text-sm"
            placeholder={t("Search by name or phone...")}
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
        </div>
        <div className="sm:w-60">
          <FilterSelect
            contactArray={
              contactGroups
                ?.filter((group) => group.id !== groupId)
                .map((group) => ({ value: group.id, label: group.name })) ?? []
            }
            setFilterByTag={setColumnFilters}
            filterByTag={columnFilters}
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label={t("Select all on this page")}
                    checked={allOnPageSelected}
                    disabled={selectableIds.length === 0}
                    onCheckedChange={(checked) => togglePage(!!checked)}
                  />
                </TableHead>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Phone Number")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : contacts.map((contact) => {
                    const member = isMember(contact.id);
                    const checked = member || selectedIds.includes(contact.id);
                    return (
                      <TableRow key={contact.id} data-state={checked ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            aria-label={t("Select {name}", { name: contact.name || contact.phone })}
                            checked={checked}
                            disabled={member}
                            onCheckedChange={(next) => toggle(contact.id, !!next)}
                          />
                        </TableCell>
                        <TableCell>
                          {contact.name}
                          {member && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {t("Already a member")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{contact.phone}</TableCell>
                      </TableRow>
                    );
                  })}
              {!isPending && contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    {t("No contacts found")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <div className="border-t px-2">
          <ContactPagination
            pagination={pagination}
            setPagination={setPagination}
            totalPageCount={Math.ceil((data?.totalCount ?? 0) / pagination.pageSize)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={close}>
          {t("Cancel")}
        </Button>
        <Button
          onClick={handleAdd}
          disabled={selectedIds.length === 0}
          loading={addExistingContacts.isPending}
        >
          {selectedIds.length > 0
            ? t("{count, plural, one {Add # contact} other {Add # contacts}}", {
                count: selectedIds.length,
              })
            : t("Add contacts")}
        </Button>
      </div>
    </div>
  );
};

export default AddExistingContacts;
