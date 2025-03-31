import React from "react";

import "@xyflow/react/dist/style.css";

import { useRouter } from "next/router";

import { Group, Stack, Tabs, Text, Title } from "@mantine/core";
import {
  IconDatabase,
  IconSettings,
  IconShare,
  IconSitemap,
} from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import {
  useWaAutomatedRepliesMessageById,
  useWaAutomatedReplyById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import LinkWithCopyBtn from "@/components/adminPanel/ShareQRPage/LinkWithCopyBtn";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";
import TanstackTable from "@/components/Table/TanstackTable";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor";

import { AutomatedReplyForm } from "./create";

const column: ColumnDef<any>[] = [
  {
    header: () => "Created At",
    accessorKey: "createdAt",
    id: "createdAt",
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
  },
  {
    header: () => "Response",
    accessorKey: "response.value",
    id: "response",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Action",
    accessorKey: "response.action",
    id: "action",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Phone",
    accessorKey: "phone",
    id: "phone",
    cell: (info) => info.getValue(),
  },
];

const WaAutomatedReplyId = () => {
  const router = useRouter();
  let automatedId = router.query.waAutomatedReplyId as string;
  const { data, isPending } = useWaAutomatedReplyById(automatedId);
  const { data: waAutomtedReplyMessage, isLoading } =
    useWaAutomatedRepliesMessageById(automatedId);
  const { data: waSettings, isPending: waPending } = useWaSettings();

  if (isPending || isLoading || waPending) return <RateupLoader />;
  let link = `https://api.whatsapp.com/send/?phone=${encodeURIComponent(waSettings?.phone?.replace("+", ""))}&text=${encodeURIComponent(data?.commands?.[0] ?? "")}`;

  return (
    <StyledTabs
      keepMounted={false}
      defaultValue="flow"
      h={"100%"}
      value={router.query.tab as string}
      onChange={(value) => router.push(`${automatedId}?tab=${value}`)}
    >
      <Group
        justify="space-between"
        display={
          !router.query.tab || router.query?.tab === "flow" ? "none" : "flex"
        }
      >
        <Tabs.List>
          <Tabs.Tab value="flow" leftSection={<IconSitemap size={18} />}>
            Flow
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={18} />}>
            settings
          </Tabs.Tab>
          <Tabs.Tab value="share" leftSection={<IconShare size={18} />}>
            share
          </Tabs.Tab>
          <Tabs.Tab value="result" leftSection={<IconDatabase size={18} />}>
            Result
          </Tabs.Tab>
        </Tabs.List>
      </Group>

      <Tabs.Panel value="flow">
        <Stack style={{ width: "100%", height: "100%" }}>
          <FlowEditor data={data} waAutomatedReplyId={automatedId} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        <Stack align="center">
          <div>
            <Title>{data?.name}</Title>
            <AutomatedReplyForm initialValues={data} editMode />
          </div>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="share">
        <Stack p={"xs"} flex={1} align="center">
          <LinkWithCopyBtn link={link} />
          <ShareQR url={link} title={`New`} isPublished={true} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="result">
        <PaperLayout p={0} h={"96%"} w={"98%"} mah={"800px"} m={"xs"}>
          <TanstackTable data={waAutomtedReplyMessage} columns={column} />
        </PaperLayout>
      </Tabs.Panel>
    </StyledTabs>
  );
};

export default WaAutomatedReplyId;
