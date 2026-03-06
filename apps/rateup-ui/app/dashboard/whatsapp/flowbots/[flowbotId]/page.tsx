"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Database, GitBranch, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useWaAutomatedRepliesMessageById,
  useWaAutomatedReplyById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useInstagramAutomationById } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { createSortableHeader, DataTable } from "@/components/Table/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor";

import { AutomatedReplyForm } from "../create";
import { DataTableToolbar } from "./data-table-toolbar";

const column: ColumnDef<any>[] = [
  {
    accessorKey: "createdAt",
    header: createSortableHeader("Created At"),
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
    meta: { title: "Created At" },
  },
  {
    accessorKey: "response.value",
    header: () => "Response",
    cell: (info) => info.getValue(),
    meta: { title: "Response" },
  },
  {
    accessorKey: "response.action",
    header: () => "Action",
    cell: (info) => info.getValue(),
    meta: { title: "Action" },
  },
  {
    accessorKey: "phone",
    header: createSortableHeader("Phone"),
    cell: (info) => info.getValue(),
    meta: { title: "Phone" },
  },
];

const FlowbotId = () => {
  const router = useRouter();
  const params = useParams();
  const flowbotId = params?.flowbotId as string;
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get("tab") || "flow";

  // Try WhatsApp API first
  const {
    data: waData,
    isPending: waPending,
    isError: waError,
    refetch: waRefetch,
  } = useWaAutomatedReplyById(flowbotId);

  // Only try Instagram API if WhatsApp query completed with no data
  const {
    data: igData,
    isPending: igPending,
    isError: igError,
    refetch: igRefetch,
  } = useInstagramAutomationById(!waPending && !waData ? flowbotId : "");

  const { data: waAutomtedReplyMessage, isLoading } =
    useWaAutomatedRepliesMessageById(flowbotId);
  const { data: waSettings, isPending: waPendingSettings } = useWaSettings();

  // Use whichever data is available (WhatsApp or Instagram)
  const data = waData || igData;

  // Still loading if WA is pending, or if WA failed and IG is pending
  const isQueryPending = waPending || (!waData && igPending);
  const isPending = isQueryPending || isLoading || waPendingSettings;

  // Only show error if both queries have completed and both failed with no data
  const hasError = !isQueryPending && waError && igError && !data;

  const refetch = async () => {
    await Promise.all([waRefetch(), igRefetch()]);
  };

  if (isPending) return <RateupLoader />;
  if (hasError)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load automation</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <Tabs
      defaultValue="flow"
      value={selectedTab}
      onValueChange={(value) => {
        refetch();
        router.push(`${flowbotId}?tab=${value}`);
      }}
      className="h-full flex flex-col"
    >
      <div
        className={cn(
          "flex items-center justify-between mx-auto",
          (!selectedTab || selectedTab === "flow") && "hidden",
        )}
      >
        <TabsList>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <GitBranch size={18} />
            Flow
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={18} />
            Settings
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center gap-2">
            <Database size={18} />
            Response
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="flow" className="flex-1 h-full">
        <FlowEditor data={data} flowbotId={flowbotId} refetch={refetch} />
      </TabsContent>
      <TabsContent value="settings">
        <div className="flex justify-center">
          <ScrollArea className="max-h-[calc(100vh-80px)]">
            <AutomatedReplyForm initialValues={data} editMode />
          </ScrollArea>
        </div>
      </TabsContent>
      <TabsContent value="response" className="h-[calc(100%-120px)]">
        <DataTable
          columns={column}
          data={waAutomtedReplyMessage}
          DataTableToolbar={DataTableToolbar}
        />
      </TabsContent>
    </Tabs>
  );
};

export default FlowbotId;
