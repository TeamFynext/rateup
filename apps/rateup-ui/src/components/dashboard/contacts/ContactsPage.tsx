// Extracted verbatim from the `/dashboard/contacts/` route so the route file carries routing
// config only. Behaviour is unchanged.

import type { ColumnDef, ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { ContactDetailHost } from "@/components/Contacts/ContactDetailedView.tsx";
import ContactMenu from "@/components/Contacts/ContactMenu.tsx";
import { contactColumn } from "@/components/Contacts/utils/utils.tsx";
import { DataTableToolbar } from "@/components/dashboard/contacts/components/data-table-toolbar.tsx";
import type { ContactTableFilter } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import { usePipelineStages } from "@/components/pipeline/shared/StageSelector.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { CONTACT_SORT } from "@/utils/constants.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

export function ContactsPage() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] = useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const { filter } = useContactTableStore();
  const {
    isPending: isLoadingContacts,
    data: contactData,
    refetch: refetchContacts,
    isError,
  } = useContacts(pagination, searchTerm, sorting?.[0], columnFilters);

  useEffect(() => {
    const filterKeys = (Object.keys(filter) as (keyof ContactTableFilter)[]).filter(
      (f) => f !== "searchTerm",
    );
    setSearchTerm(filter.searchTerm);
    setColumnFilters(filterKeys.map((key) => ({ id: key, value: filter[key] })));
  }, [filter]);

  const { customFields } = useCustomFieldsContext();

  const { user } = useUser();
  const pipelineStages = usePipelineStages();
  const column = useMemo(
    () => [
      ...contactColumn(customFields || [], user?.showLifecycle, pipelineStages.length > 0),
      {
        header: "Action",
        accessorFn: (row) => row,
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        // The accessor hands the whole row through; the column's value type is
        // erased to `unknown` by ColumnDef, so narrow it back here.
        cell: (info) => <ContactMenu contact={info.getValue() as ContactsData} groupId={""} />,
        meta: { title: "Action" },
      } satisfies ColumnDef<ContactsData, unknown>,
    ],
    [customFields, user?.showLifecycle, pipelineStages.length],
  );

  const contactMemoData = useMemo(() => contactData?.users ?? [], [contactData?.users]);

  /** A column is identified by its accessor key when it has one, else by its id. */
  const columnKey = (column: { accessorKey?: unknown; id?: string }) =>
    String(column.accessorKey ?? column.id ?? "");

  const defaultColumnVisibility = useMemo(
    () =>
      column.reduce((visibility: Record<string, boolean>, key) => {
        if (
          !["select", "name", "phone", "ContactLabelMap", "source", "createdAt", "action"].includes(
            columnKey(key),
          )
        ) {
          visibility[columnKey(key)] = false;
        }
        return visibility;
      }, {}),
    [column],
  );

  if (isError) return <ErrorComponent refetch={refetchContacts} />;

  return (
    <div className="h-full">
      <DataTable
        columns={column}
        data={contactMemoData ?? []}
        DataTableToolbar={DataTableToolbar}
        serverSide={{
          pagination,
          onPaginationChange: setPagination,
          rowCount: contactData?.totalCount || 0,
          sorting,
          onSortingChange: setSorting,
        }}
        isPending={isLoadingContacts}
        defaultColumnVisibility={defaultColumnVisibility}
      />
      <ContactDetailHost />
    </div>
  );
}

export function FilterSelect({
  setFilterByTag,
  filterByTag,
  contactArray,
}: {
  setFilterByTag: Dispatch<SetStateAction<ColumnFiltersState>>;
  filterByTag: ColumnFiltersState;
  contactArray: { value: string; label: string }[];
}) {
  const { t: translations } = useTranslation();
  // The selection lives in the table's column filters as one comma-joined entry.
  const selected = String(filterByTag?.find((item) => item.id === "filterGroupName")?.value ?? "")
    .split(",")
    .filter(Boolean);

  return (
    <MultiSelect
      options={contactArray ?? []}
      value={selected}
      onValueChange={(values) => {
        setFilterByTag((prev) => {
          const rest = prev.filter((item) => item.id !== "filterGroupName");
          return values.length === 0
            ? rest
            : [...rest, { id: "filterGroupName", value: values.join(",") }];
        });
      }}
      placeholder={translations("Filter by group")}
    />
  );
}
