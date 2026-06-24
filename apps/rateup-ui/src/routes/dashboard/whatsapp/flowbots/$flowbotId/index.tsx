import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";

import "@xyflow/react/dist/style.css";

import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Database, GitBranch, Settings } from "lucide-react";

import {
  useWaAutomatedRepliesMessageById,
  useWaAutomatedReplyById,
} from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor.tsx";
import { cn } from "@/lib/utils.ts";

import { DataTableToolbar } from "../../../../../components/dashboard/whatsapp/flowbots/$flowbotId/data-table-toolbar.tsx";
import { AutomatedReplyForm } from "../../../../../components/dashboard/whatsapp/flowbots/create.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flowbots/$flowbotId/")({
  component: FlowbotId,
});

const column: ColumnDef<any>[] = [
  {
    accessorKey: "createdAt",
    header: createSortableHeader("Created At"),
    cell: (info) => dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
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

function FlowbotId() {
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });
  const flowbotId = params?.flowbotId as string;
  const searchParams = useSearch({ strict: false });
  const selectedTab = searchParams.tab || "flow";

  // Try WhatsApp API first
  const {
    data: waData,
    isPending: waPending,
    isError: waError,
    refetch: waRefetch,
  } = useWaAutomatedReplyById(flowbotId);

  const { data: waAutomtedReplyMessage, isLoading } = useWaAutomatedRepliesMessageById(flowbotId);
  const { isPending: waPendingSettings } = useWaSettings();

  const data = waData;
  const isQueryPending = waPending;
  const isPending = isQueryPending || isLoading || waPendingSettings;

  const hasError = !isQueryPending && waError && !data;

  const refetch = async () => {
    await waRefetch();
  };

  if (isPending) return <RateupLoader />;
  if (hasError)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load automation</p>
          <button onClick={refetch} className="px-4 py-2 bg-blue-500 text-white rounded">
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
        navigate({
          to: `?tab=${value}`,
        });
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
}
