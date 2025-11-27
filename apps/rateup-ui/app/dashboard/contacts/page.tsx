"use client";

import { useEffect, useMemo, useState } from "react";

import { TextInput } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import ContactMenu from "@/components/Contacts/ContactMenu";
import { CONTACT_SORT, contactColumn } from "@/components/Contacts/utils/utils";
import { ContainedMultiSelect } from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { DataTable } from "@/components/Table/data-table";
import { Input } from "@/components/ui/input";
import { useCustomFieldsContext } from "@/context/CustomFieldsContext";
import { PAGE_SIZE } from "@/utils/constants";

import { columns } from "./components/columns";
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
  const translations = useTranslations();

  const column = useMemo(
    () => [
      ...contactColumn(customFields || []),
      {
        header: "Action",
        accessorFn: (row) => row,
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        cell: (info) => <ContactMenu contact={info.getValue()} groupId={""} />,
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
      Object.keys(contactMemoData?.[0] || {}).reduce((visibility, key) => {
        if (
          !["name", "phone", "ContactLabelMap", "source", "createdAt"].includes(
            key,
          )
        ) {
          visibility[key] = false;
        }
        return visibility;
      }, {}),
    [contactMemoData],
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
  const translations = useTranslations();
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
