"use client";

import { useMemo, useState } from "react";

import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col min-h-[80dvh]">
      <WaAutomationCardsList
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setOpened={setOpened}
      />

      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{translations("Create Chatbot")}</DialogTitle>
          </DialogHeader>
          <AutomatedReplyForm close={() => setOpened(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const WaAutomationCardsList = ({
  searchQuery,
  setSearchQuery,
  setOpened,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setOpened: (value: boolean) => void;
}) => {
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isPending = waPending || igPending;
  const isError = waError || igError;

  const handleRefetch = async () => {
    setIsRefreshing(true);
    const result = await Promise.all([waRefetch(), igRefetch()]);
    setIsRefreshing(false);
    return result as any;
  };

  // Combine both WhatsApp and Instagram automations
  const combinedData = useMemo(() => {
    return [...(waData || []), ...(igData || [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [waData, igData]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return combinedData;

    const query = searchQuery.toLowerCase();
    return combinedData.filter((automation) =>
      automation.name?.toLowerCase().includes(query),
    );
  }, [combinedData, searchQuery]);

  if (isPending) return <AutomatedReplyCardListSkeleton />;
  if (isError) return <ErrorComponent refetch={handleRefetch} />;

  if (combinedData.length === 0)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4">
        <NothingFound text={translations("No Automated Replies Found")} />
        <Button onClick={() => setOpened(true)} className="h-9 px-4 gap-2">
          <IconPlus className="h-4 w-4" />
          {translations("Create Chatbot")}
        </Button>
      </div>
    );

  if (filteredData.length === 0 && searchQuery.trim()) {
    return (
      <>
        <div className="bg-background border-b border-border px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div>
                <h1 className="text-lg font-semibold">
                  {translations("Chatbots")}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {translations("Create and manage your automated chatbots")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={translations("Search chatbots...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefetch}
                disabled={isRefreshing}
                className="h-9 w-9"
              >
                <IconRefresh
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                onClick={() => setOpened(true)}
                className="h-9 px-3 gap-2"
              >
                <IconPlus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {translations("Create")}
                </span>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            {translations("No chatbots found matching your search")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <h1 className="text-lg font-semibold">
                {translations("Chatbots")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredData.length}{" "}
                {filteredData.length === 1 ? "chatbot" : "chatbots"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={translations("Search chatbots...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefetch}
              disabled={isRefreshing}
              className="h-9 w-9"
            >
              <IconRefresh
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button onClick={() => setOpened(true)} className="h-9 px-3 gap-2">
              <IconPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{translations("Create")}</span>
            </Button>
          </div>
        </div>
      </div>
      <WaAutomationCards data={filteredData} />
    </>
  );
};
