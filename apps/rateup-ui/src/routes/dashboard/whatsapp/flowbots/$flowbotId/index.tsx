import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { useWaAutomatedReplyById } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor.tsx";

import { AutomatedReplyForm } from "../../../../../components/dashboard/whatsapp/flowbots/create.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flowbots/$flowbotId/")({
  component: FlowbotId,
});

function FlowbotId() {
  const params = useParams({ strict: false });
  const flowbotId = params?.flowbotId as string;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    data,
    isPending: waPending,
    isError: waError,
    refetch: waRefetch,
  } = useWaAutomatedReplyById(flowbotId);
  const { isPending: waPendingSettings } = useWaSettings();

  const isPending = waPending || waPendingSettings;
  const hasError = !waPending && waError && !data;

  const refetch = async () => {
    await waRefetch();
  };

  if (isPending) return <RateupLoader />;
  if (hasError)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load automation</p>
          <button onClick={refetch} className="px-4 py-2 bg-blue-500 text-white rounded">
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <div className="h-full">
      <FlowEditor data={data} refetch={refetch} onOpenSettings={() => setSettingsOpen(true)} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Automation settings</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-88px)] px-6 pb-6">
            <AutomatedReplyForm initialValues={data} editMode />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
