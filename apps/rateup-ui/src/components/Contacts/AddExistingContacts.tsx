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
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { Button } from "../ui/button.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";
import {
  ContactListFilters,
  toContactListQuery,
  useContactListFilters,
} from "./ContactListFilters.tsx";
import ContactPagination from "./ContactPagination.tsx";

/**
 * Picks contacts already in the org and adds them to a group. Members of the group are shown
 * ticked and locked, so the list reads as the whole contact book rather than hiding them.
 *
 * Every filter is applied by the contacts list endpoint, so "Add all matching" sends the same
 * query and the server adds everyone it matches — not just the page on screen.
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
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupFilters, setGroupFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  // The search input is uncontrolled; bumping this remounts it empty on "Clear filters".
  const [resetKey, setResetKey] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  // Filters change which rows exist, so start again from the first page.
  const resetPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  const listFilters = useContactListFilters(resetPage);
  const filters = [...groupFilters, ...listFilters.filters];

  const { data: contactGroups } = useContactGroup();
  const addExistingContacts = useAddExistingContactMutation();
  const { isPending, data } = useContacts(pagination, searchTerm, undefined, filters);

  const contacts = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const isNarrowed = filters.length > 0 || searchTerm.trim().length > 0;
  const isMember = (id: string) => existingContactIds.includes(id);
  const selectableIds = contacts.map((contact) => contact.id).filter((id) => !isMember(id));
  const allOnPageSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  function clearFilters() {
    setGroupFilters([]);
    listFilters.clear();
    setSearchTerm("");
    setResetKey((key) => key + 1);
    resetPage();
  }

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

  const onAdded = {
    onSuccess: () => {
      setSelectedIds([]);
      close();
    },
  };

  function handleAdd() {
    addExistingContacts.mutate({ customerList: selectedIds, groupId }, onAdded);
  }

  async function handleAddAllMatching() {
    const ok = await confirm({
      title: t("Add all matching contacts"),
      description: t(
        "{count, plural, one {# contact matches} other {# contacts match}} these filters. Anyone already in the group is skipped.",
        { count: totalCount },
      ),
      confirmText: t("Add all"),
      cancelText: t("Cancel"),
    });
    if (!ok) return;
    addExistingContacts.mutate(
      { groupId, filter: toContactListQuery(filters, searchTerm) },
      onAdded,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <FieldLabel htmlFor="add-existing-search" className="sr-only">
              {t("Search Contact")}
            </FieldLabel>
            <Input
              key={resetKey}
              id="add-existing-search"
              type="search"
              className="border-none bg-muted pl-9 placeholder:text-sm"
              placeholder={t("Search by name or phone...")}
              defaultValue={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.currentTarget.value);
                resetPage();
              }}
            />
          </div>
          <div className="sm:w-60">
            <FilterSelect
              contactArray={
                contactGroups
                  ?.filter((group) => group.id !== groupId)
                  .map((group) => ({ value: group.id, label: group.name })) ?? []
              }
              setFilterByTag={(value) => {
                setGroupFilters(value);
                resetPage();
              }}
              filterByTag={groupFilters}
            />
          </div>
          {isNarrowed && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("Clear filters")}
            </Button>
          )}
        </div>
        <ContactListFilters controls={listFilters.controls} />
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
            totalPageCount={Math.ceil(totalCount / pagination.pageSize)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isNarrowed && totalCount > 0 && (
          <Button
            variant="outline"
            className="sm:mr-auto"
            onClick={handleAddAllMatching}
            disabled={addExistingContacts.isPending}
          >
            {t("{count, plural, one {Add # matching contact} other {Add all # matching}}", {
              count: totalCount,
            })}
          </Button>
        )}
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
