"use client";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";
import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
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

export const Route = createFileRoute("/dashboard/instagram/flowbots/")({
  component: InstagramFlowbotsPage,
});

function InstagramFlowbotsPage() {
  const {
    data: igData,
    isPending: igPending,
    isError: igError,
    refetch: igRefetch,
  } = useAllInstagramAutomations();

  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const { t: translations } = useTranslation();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 200);

  const isLoading = igPending;
  const isError = igError;

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();

    const filtered = normalizedSearch
      ? (igData || []).filter((automation) => {
          return automation.name?.toLowerCase().includes(normalizedSearch);
        })
      : igData || [];

    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [igData, debouncedSearchQuery, sortOption]);

  const isEmpty = !isLoading && !isError && filteredData.length === 0;

  const handleRefetch = () => {
    void igRefetch();
  };

  return (
    <>
      <ListPageLayout
        canCreate
        createLabel={translations("Create Chatbot")}
        createDisabledText=""
        docsUrl="whatsapp/chatbot"
        isLoading={isLoading}
        queryKeys={["allInstagramAutomations"]}
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
          detailsBasePath="/dashboard/instagram/flowbots"
        />
      </ListPageLayout>
      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-175">
          <DialogHeader>
            <DialogTitle>{translations("Create Chatbot")}</DialogTitle>
          </DialogHeader>
          <AutomatedReplyForm
            close={() => setOpened(false)}
            platform={AutomationPlatform.INSTAGRAM}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
