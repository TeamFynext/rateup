"use client";

import { useEffect, useMemo, useState } from "react";

import { useDebouncedState } from "@mantine/hooks";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useExtracted } from "next-intl";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import ContactMenu from "@/components/Contacts/ContactMenu";
import { CONTACT_SORT, contactColumn } from "@/components/Contacts/utils/utils";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import { DataTable } from "@/components/Table/data-table";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { useUser } from "@/context/UserContext";
import { PAGE_SIZE } from "@/utils/constants";

import { DataTableToolbar } from "./components/data-table-toolbar";
import { useContactTableStore } from "./store/contact-table-store";

export enum ContactTabs {
  GROUPS = "groups",
  CONTACTS = "All Contacts",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const { filter } = useContactTableStore();
  const {
    isPending: isLoadingContacts,
    data: contactData,
    refetch: refetchContacts,
    isRefetching,
    isError,
  } = useContacts(pagination, searchTerm, sorting?.[0], columnFilters);

  useEffect(() => {
    const filterKeys = Object.keys(filter).filter((f) => f !== "searchTerm");
    setSearchTerm(filter.searchTerm);
    setColumnFilters(
      filterKeys.map((key) => ({ id: key, value: filter[key] })),
    );
  }, [filter]);

  const { customFields } = useCustomFieldsContext();
  const translations = useExtracted();
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

  const contactMemoData = useMemo(
    () => contactData?.users ?? [],
    [contactData?.users],
  );

  const defaultColumnVisibility = useMemo(
    () =>
      column.reduce((visibility, key) => {
        if (
          ![
            "select",
            "name",
            "phone",
            "ContactLabelMap",
            "source",
            "createdAt",
            "action",
          ].includes((key as any)?.accessorKey || key?.id)
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
        manualPagination={{
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

export const FilterSelect = ({ setFilterByTag, filterByTag, contactArray }) => {
  const translations = useExtracted();
  return (
    <ContainedMultiSelect
      data={[{ group: "Groups", items: contactArray ?? [] }]}
      defaultValue={filterByTag}
      onChange={(e) => {
        setFilterByTag((prev) => {
          if (e.length === 0) {
            return prev.filter((item) => item.id !== "filterGroupName");
          }
          return [...prev, { id: "filterGroupName", value: e.join(",") }];
        });
      }}
      placeholder={translations("Filter contacts")}
    />
  );
};
export enum ContactAcions {
  DELETE_CONTACTS = "Delete Contacts",
  ADD_CONTACTS_TO_GROUP = "Add Contacts to Group",
  DELETE_GROUPS = "Delete Groups",
}
