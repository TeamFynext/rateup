import React from "react";

import { ActionIcon, List, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import { useWaLogs } from "@/backend/whatsapp/settings/waSettings.query";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import TanstackTable from "@/components/Table/TanstackTable";
import useTranslations from "@/dictionaries/useTranslation";
import { showLoadingToast, showSuccessToast } from "@/utils/notifications";

const Logs = () => {
  const { data, isPending, refetch } = useWaLogs();
  const { translations } = useTranslations();

  const columns: ColumnDef<any>[] = [
    {
      header: () => "Created",
      accessorKey: "createdAt",
      cell: (info) =>
        dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
    },
    {
      header: () => "Error code",
      id: "error_code",
      accessorFn: (row) => row?.logs,
      enableColumnFilter: false,
      cell: (info) => {
        const logs = info.getValue() as { code: number }[];
        return (
          <List size="sm" icon={logs?.length > 0 && <></>}>
            {logs?.map((data, index) => (
              <List.Item key={data?.code || index}>{data?.code}</List.Item>
            ))}
          </List>
        );
      },
    },
    {
      header: () => "Message",
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
    <Tooltip label={translations["Refresh"]}>
      <ActionIcon
        variant="light"
        onClick={async () => {
          showLoadingToast(
            translations["Data getting loaded..."],
            "contacts",
            true,
            translations["Loading"],
          );
          await refetch();
          showSuccessToast(
            translations["Data updated"],
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
    <PaperLayout p={0} h={"100%"} mah={"800px"}>
      <TanstackTable
        data={data}
        columns={columns}
        isPending={isPending}
        toggleOffContent={refreshButton}
      />
    </PaperLayout>
  );
};

export default Logs;
