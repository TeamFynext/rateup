"use client";

import { useMemo, useState } from "react";

import { useExtracted } from "next-intl";

import { WaAutomatedReply } from "@/types/global";
import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { ListPageLayout } from "@/components/common/list-page-layout";
import { sortData } from "@/components/Dashboard/SortDropDown";
import useDebounce from "@/components/menu/hook/useDebounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards";

import { AutomatedReplyForm } from "./create";

export default function FlowbotsPage() {
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

  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const translations = useExtracted();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 200);

  const isLoading = waPending || igPending;
  const isError = waError || igError;

  const combinedData = useMemo<WaAutomatedReply[]>(() => {
    return [...(waData || []), ...(igData || [])];
  }, [waData, igData]);

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();

    const filtered = normalizedSearch
      ? combinedData.filter((automation) => {
          return automation.name?.toLowerCase().includes(normalizedSearch);
        })
      : combinedData;

    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [combinedData, debouncedSearchQuery, sortOption]);

  const isEmpty = !isLoading && !isError && filteredData.length === 0;

  const handleRefetch = () => {
    void Promise.all([waRefetch(), igRefetch()]);
  };

  return (
    <>
      <ListPageLayout
        canCreate
        createLabel={translations("Create Chatbot")}
        createDisabledText=""
        docsUrl="whatsapp/chatbot"
        isLoading={isLoading}
        queryKeys={["allWaAutomatedReplies", "allInstagramAutomations"]}
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
        <WaAutomationCards data={filteredData} />
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
