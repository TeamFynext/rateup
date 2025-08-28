"use client";

import React, { useState } from "react";

import "@xyflow/react/dist/style.css";

import { useParams, useRouter, useSearchParams } from "next/navigation";

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
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import StyledTabs from "@/components/styled/StyledTabs/StyledTabs";
import ShareQR from "@/components/Survey/ShareSurvey/ShareQR";
import TanstackTable from "@/components/Table/TanstackTable";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor";

import { AutomatedReplyForm } from "../create";

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
  const params = useParams();
  const automatedId = params?.waAutomatedReplyId as string;
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get("tab") as string;

  const { data, isPending, refetch } = useWaAutomatedReplyById(automatedId);
  const { data: waAutomtedReplyMessage, isLoading } =
    useWaAutomatedRepliesMessageById(automatedId);
  const { data: waSettings, isPending: waPending } = useWaSettings();

  if (isPending || isLoading || waPending) return <RateupLoader />;

  return (
    <StyledTabs
      keepMounted={false}
      defaultValue="flow"
      h={"100%"}
      value={selectedTab}
      onChange={(value) => router.push(`${automatedId}?tab=${value}`)}
    >
      <Group
        justify="space-between"
        display={!selectedTab || selectedTab === "flow" ? "none" : "flex"}
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
          <Tabs.Tab value="response" leftSection={<IconDatabase size={18} />}>
            Response
          </Tabs.Tab>
        </Tabs.List>
      </Group>

      <Tabs.Panel value="flow">
        <Stack style={{ width: "100%", height: "100%" }}>
          <FlowEditor
            data={data}
            waAutomatedReplyId={automatedId}
            refetch={refetch}
          />
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
        <ShareLinkTab waSettings={waSettings} data={data} />
      </Tabs.Panel>
      <Tabs.Panel value="response">
        <PaperLayout p={0} h={"96%"} w={"98%"} mah={"800px"} m={"xs"}>
          <TanstackTable data={waAutomtedReplyMessage} columns={column} />
        </PaperLayout>
      </Tabs.Panel>
    </StyledTabs>
  );
};

export default WaAutomatedReplyId;

type WaSetting = { phone: string };
type AutomatedReply = { name?: string; commands?: string[] };

const sanitizePhone = (phone?: string) => (phone || "").replace(/[^\d]/g, "");

const ShareLinkTab: React.FC<{
  waSettings?: WaSetting[];
  data?: AutomatedReply;
}> = ({ waSettings, data }) => {
  const [account, setAccount] = useState<string | undefined>(
    waSettings?.[0]?.phone,
  );
  const [command, setCommand] = useState<string | undefined>(
    data?.commands?.[0],
  );

  const accountOptions = React.useMemo(
    () =>
      (waSettings || []).map((item) => ({
        label: item.phone,
        value: item.phone,
      })),
    [waSettings],
  );

  const commandOptions = React.useMemo(
    () =>
      (data?.commands || []).map((item) => ({
        label: item,
        value: item,
      })),
    [data?.commands],
  );

  const url = React.useMemo(() => {
    const phone = sanitizePhone(account);
    if (!phone) return "";
    const link = new URL("https://api.whatsapp.com/send/");
    link.searchParams.set("phone", phone);
    if (command) link.searchParams.set("text", command);
    return link.toString();
  }, [account, command]);

  const hasAccounts = accountOptions.length > 0;
  const hasCommands = commandOptions.length > 0;

  return (
    <Stack p={"xs"} flex={1} align="center">
      <Group>
        <ContainedSelection
          label="Select WhatsApp Account"
          value={account}
          onChange={setAccount}
          data={accountOptions}
          allowDeselect={false}
          disabled={!hasAccounts}
        />
        <ContainedSelection
          label="Select Command"
          value={command}
          onChange={setCommand}
          data={commandOptions}
          allowDeselect={false}
          disabled={!hasCommands}
        />
        <LinkWithCopyBtn link={url} label="Share Link" />
      </Group>
      <ShareQR
        url={url}
        title={data?.name || "WhatsApp link"}
        isPublished={Boolean(hasAccounts)}
      />
      {!hasAccounts && (
        <Text c="dimmed" size="sm">
          No WhatsApp accounts available. Please add an account.
        </Text>
      )}
      {hasAccounts && !hasCommands && (
        <Text c="dimmed" size="sm">
          No commands found for this automated reply.
        </Text>
      )}
    </Stack>
  );
};
