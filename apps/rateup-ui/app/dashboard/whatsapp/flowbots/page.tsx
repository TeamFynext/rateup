"use client";

import { useState } from "react";

import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { AutomatedReplyCardListSkeleton } from "@/components/animation/skeleton/wa/AutomatedReplyCardList.skeleton";
import NothingFound from "@/components/NothingFound/NothingFound";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards";

import { AutomatedReplyForm } from "./create";

export default function FlowbotsPage() {
  const translations = useTranslations();
  const [opened, setOpened] = useState(false);

  return (
    <div className="flex flex-col min-h-[80dvh]">
      <div className="flex items-center justify-between">
        <div className="ml-4">
          <Button onClick={() => setOpened(true)}>
            {translations("Create Chatbot")}
            <IconPlus size={"1rem"} className="ml-2" />
          </Button>
        </div>
        <Dialog open={opened} onOpenChange={setOpened}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>{translations("Create Chatbot")}</DialogTitle>
            </DialogHeader>
            <AutomatedReplyForm close={() => setOpened(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <WaAutomationCardsList />
    </div>
  );
}

const WaAutomationCardsList = () => {
  const {
    data: waData,
    isPending: waPending,
    isError: waError,
    refetch: waRefetch,
  } = useAllWaAutomatedReplies();
  const {
    data: igData,
    isPending: igPending,
    isError: igError,
    refetch: igRefetch,
  } = useAllInstagramAutomations();
  const translations = useTranslations();

  const isPending = waPending || igPending;
  const isError = waError || igError;

  const handleRefetch = async () => {
    return (await Promise.all([waRefetch(), igRefetch()])) as any;
  };

  if (isPending) return <AutomatedReplyCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={handleRefetch} />;

  // Combine both WhatsApp and Instagram automations
  const combinedData = [...(waData || []), ...(igData || [])];

  if (combinedData.length === 0)
    return <NothingFound text={translations("No Automated Replies Found")} />;
  return <WaAutomationCards data={combinedData} />;
};
