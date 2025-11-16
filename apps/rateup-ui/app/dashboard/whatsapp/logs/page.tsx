"use client";

import { useState } from "react";

import { List } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { useWaLogs } from "@/backend/whatsapp/settings/waSettings.query";
import { CONTACT_SORT } from "@/components/Contacts/utils/utils";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { Spinner } from "@/components/ui/spinner";

import { DataTableToolbar } from "./data-table-toolbar";

dayjs.extend(utc);

const Logs = () => {
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isPending } = useWaLogs(
    pagination,
    "",
    sorting?.[0],
    columnFilters,
  );

  const columns: ColumnDef<any>[] = [
    {
      header: createSortableHeader("Timestamp"),
      accessorKey: "createdAt",
      cell: (info) =>
        info.getValue() &&
        dayjs.utc(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
    },
    {
      header: () => "Phone Number",
      accessorKey: "phone",
    },
    {
      header: () => "Error Messages",
      id: "logs",
      enableColumnFilter: false,
      accessorFn: (row) => row?.logs,
      cell: (info) => {
        const logs = info.getValue() as {
          code: number;
          title: string;
          message: string;
        }[];
        return (
          <List size="sm" variant="">
            {logs?.map((data, index) => (
              <List.Item key={data?.code || index}>
                {data?.message || data?.title}
              </List.Item>
            ))}
          </List>
        );
      },
    },
    {
      header: () => "Error Details",
      id: "logsDetail",
      enableColumnFilter: false,
      accessorFn: (row) => row?.logs,
      cell: (info) => {
        const logs = info.getValue() as {
          code: number;
          error_data: {
            details: string;
          };
        }[];
        return (
          <List size="sm" variant="">
            {logs?.map((data, index) => (
              <List.Item key={data?.code || index}>
                {data?.error_data?.details || "N/A"}
              </List.Item>
            ))}
          </List>
        );
      },
    },
  ];
  if (isPending)
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  return (
    <DataTable
      columns={columns}
      data={(data?.logs as any) ?? []}
      DataTableToolbar={DataTableToolbar}
      manualPagination={{
        pagination,
        onPaginationChange: (updater) => setPagination(updater),
        rowCount: data?.totalCount || 0,
        sorting,
        onSortingChange: (updater) => setSorting(updater),
        columnFilters,
        onColumnFiltersChange: (updater) => setColumnFilters(updater),
      }}
    />
  );
};

export default Logs;
