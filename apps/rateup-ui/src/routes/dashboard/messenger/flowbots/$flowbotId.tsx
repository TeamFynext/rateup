import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useMessengerAutomationById } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { TriggerSetupPrompt } from "@/components/dashboard/chatbots/TriggerSetupPrompt.tsx";
import { AutomatedReplyForm } from "@/components/dashboard/whatsapp/flowbots/create.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export const Route = createFileRoute("/dashboard/messenger/flowbots/$flowbotId")({
  component: MessengerFlowbotId,
});

function MessengerFlowbotId() {
  const { t } = useTranslation();
  const params = useParams({ strict: false });
  const flowbotId = params?.flowbotId ?? "";
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data, isPending, isError, refetch } = useMessengerAutomationById(flowbotId);

  if (isPending) return <RateupLoader />;
  if (isError || !data)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-4">{t("Failed to load automation")}</p>
          <Button onClick={() => void refetch()}>{t("Retry")}</Button>
        </div>
      </div>
    );

  return (
    <div className="relative h-full">
      <TriggerSetupPrompt platform={AutomationPlatform.FACEBOOK} />
      <FlowEditor
        data={data}
        refetch={() => void refetch()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Automation settings")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-88px)] px-6 pb-6">
            <AutomatedReplyForm initialValues={data} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
