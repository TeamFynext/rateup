import { createFileRoute } from "@tanstack/react-router";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import ContactMenu from "@/components/Contacts/ContactMenu.tsx";
import { CONTACT_SORT, contactColumn } from "@/components/Contacts/utils/utils.tsx";
import { DataTable } from "@/components/Table/data-table.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useDebouncedState } from "@/hooks/use-debounced-state.ts";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { DataTableToolbar } from "../../../components/dashboard/contacts/components/data-table-toolbar.tsx";
import { useContactTableStore } from "../../../components/dashboard/contacts/store/contact-table-store.ts";

export const Route = createFileRoute("/dashboard/contacts/")({
  component: Contacts,
});

function Contacts() {
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
    const filterKeys = Object.keys(filter).filter((f) => f !== "searchTerm");
    setSearchTerm(filter.searchTerm);
    setColumnFilters(filterKeys.map((key) => ({ id: key, value: filter[key] })));
  }, [filter]);

  const { customFields } = useCustomFieldsContext();

  const { user } = useUser();
  const column = useMemo(
    () => [
      ...contactColumn(customFields || [], user?.showLifecycle),
      {
        header: "Action",
        accessorFn: (row) => row,
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        cell: (info) => <ContactMenu contact={info.getValue()} groupId={""} />,
        meta: { title: "Action" },
      },
    ],
    [customFields],
  );

  const contactMemoData = useMemo(() => contactData?.users ?? [], [contactData?.users]);

  const defaultColumnVisibility = useMemo(
    () =>
      column.reduce((visibility, key) => {
        if (
          !["select", "name", "phone", "ContactLabelMap", "source", "createdAt", "action"].includes(
            (key as any)?.accessorKey || key?.id,
          )
        ) {
          visibility[(key as any)?.accessorKey || key?.id] = false;
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
    </div>
  );
}

export function FilterSelect({ setFilterByTag, filterByTag, contactArray }) {
  const { t: translations } = useTranslation();
  // The selection lives in the table's column filters as one comma-joined entry.
  const selected = (filterByTag?.find((item) => item.id === "filterGroupName")?.value ?? "")
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
      placeholder={translations("Filter contacts")}
    />
  );
}
