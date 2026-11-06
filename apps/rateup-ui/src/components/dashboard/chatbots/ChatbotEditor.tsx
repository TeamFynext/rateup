import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChatbot } from "@/backend/chatbots/chatbots.query.ts";
import { ChatbotStartPanel } from "@/components/dashboard/chatbots/ChatbotStartPanel.tsx";
import { AutomatedReplyForm } from "@/components/dashboard/whatsapp/flowbots/create.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import FlowEditor from "@/components/whatsapp/automation/components/flow-editor.tsx";
import { automationPlatformOf } from "@/types/platform.ts";

/**
 * The builder for one chatbot, on any channel. What the builder offers (blocks, preview,
 * settings) follows the chatbot's own channel.
 */
export function ChatbotEditor({ chatbotId }: Readonly<{ chatbotId: string }>) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data, isPending, isError, refetch } = useChatbot(chatbotId);

  if (isPending) return <RateupLoader />;
  if (isError || !data)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-destructive">{t("Failed to load the journey")}</p>
          <Button onClick={() => void refetch()}>{t("Retry")}</Button>
        </div>
      </div>
    );

  return (
    <div className="relative h-full">
      <ChatbotStartPanel
        chatbotId={chatbotId}
        platform={automationPlatformOf(data.platform)}
        isActive={data.isActive ?? true}
      />
      <FlowEditor
        data={data}
        refetch={() => void refetch()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Journey settings")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-88px)] px-6 pb-6">
            <AutomatedReplyForm initialValues={data} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
