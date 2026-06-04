"use client";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { WaAutomatedReply } from "@/types/global";
import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { ListPageLayout } from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards.tsx";

import { AutomatedReplyForm } from "../../../../components/dashboard/whatsapp/flowbots/create.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flowbots/")({
  component: FlowbotsPage,
});

function FlowbotsPage() {
  const {
    data: waData,
    isPending: waPending,
    isError: waError,
    refetch: waRefetch,
  } = useAllWaAutomatedReplies();

  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const { t: translations } = useTranslation();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 200);

  const isLoading = waPending;
  const isError = waError;

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();

    const filtered = normalizedSearch
      ? (waData || []).filter((automation) => {
          return automation.name?.toLowerCase().includes(normalizedSearch);
        })
      : waData || [];

    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [waData, debouncedSearchQuery, sortOption]);

  const isEmpty = !isLoading && !isError && filteredData.length === 0;

  const handleRefetch = () => {
    void waRefetch();
  };

  return (
    <>
      <ListPageLayout
        canCreate
        createLabel={translations("Create Chatbot")}
        createDisabledText=""
        docsUrl="whatsapp/chatbot"
        isLoading={isLoading}
        queryKeys={["allWaAutomatedReplies"]}
        search={searchQuery}
        searchPlaceholder={translations("Search chatbots...")}
        tourSteps={[]}
        onCreate={() => setOpened(true)}
        onSearchChange={setSearchQuery}
        sortValue={sortOption}
        onSortChange={setSortOption}
        isError={isError}
        onRetry={handleRefetch}
        isEmpty={isEmpty}
        emptyTitle={
          debouncedSearchQuery
            ? translations("No chatbots found matching your search")
            : translations("No chatbots found")
        }
        emptyDescription={
          debouncedSearchQuery
            ? translations("Try a different search term.")
            : translations(
                "Create your first chatbot to start automating conversations.",
              )
        }
      >
        <WaAutomationCards
          data={filteredData}
          detailsBasePath="/dashboard/whatsapp/flowbots"
        />
      </ListPageLayout>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-175">
          <DialogHeader>
            <DialogTitle>{translations("Create Chatbot")}</DialogTitle>
          </DialogHeader>
          <AutomatedReplyForm close={() => setOpened(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
