"use client";

import React, { useState } from "react";

import { ActionIcon, Box, List, Tooltip } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslations } from "next-intl";

import { useWaLogs } from "@/backend/whatsapp/settings/waSettings.query";
import { CONTACT_SORT } from "@/components/Contacts/utils/utils";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import { PAGE_SIZE } from "@/utils/constants";
import { showLoadingToast, showSuccessToast } from "@/utils/notifications";

dayjs.extend(utc);

const Logs = () => {
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE[0],
  });
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const { data, isPending, refetch } = useWaLogs(
    pagination,
    searchText,
    sorting?.[0],
    columnFilters,
  );
  const translations = useTranslations();

  const columns: ColumnDef<any>[] = [
    {
      header: () => "Time",
      accessorKey: "createdAt",
      cell: (info) =>
        info.getValue() &&
        dayjs.utc(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
    },
    {
      header: () => "Phone",
      accessorKey: "phone",
    },
    {
      header: () => "Error",
      id: "logs",
      enableColumnFilter: false,
      accessorFn: (row) => row?.logs,
      cell: (info) => {
        const logs = info.getValue() as { code: number; title: string }[];
        return (
          <List size="sm" variant="" icon={logs?.length > 0 && <></>}>
            {logs?.map((data, index) => (
              <List.Item key={data?.code || index}>{data?.title}</List.Item>
            ))}
          </List>
        );
      },
    },
  ];
  const refreshButton = (
    <Tooltip label={translations("Refresh")}>
      <ActionIcon
        variant="light"
        onClick={async () => {
          showLoadingToast(
            translations("Data getting loaded"),
            "contacts",
            true,
            translations("Loading"),
          );
          await refetch();
          showSuccessToast(
            translations("Data updated"),
            "contacts",
            <IconCheck />,
            true,
          );
        }}
      >
        <IconRefresh stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
  return (
    <Box m={"xs"} h={"97%"}>
      <PaperLayout p={0} h={"100%"}>
        <ContactTable
          data={data?.logs ?? []}
          columns={columns}
          isPending={isPending}
          refetch={refetch}
          setSorting={setSorting}
          sorting={sorting}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          setPagination={setPagination}
          pagination={pagination}
          leftSection={refreshButton}
          totalCount={data?.totalCount ?? 0}
        />
      </PaperLayout>
    </Box>
  );
};

export default Logs;
