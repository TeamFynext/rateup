import { IconPlus } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards.tsx";
import type { WaAutomatedReply } from "@/types/global";

import { AutomatedReplyForm } from "../../../../components/dashboard/whatsapp/flowbots/create.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flowbots/")({
  component: FlowbotsPage,
});

function FlowbotsPage() {
  const { data: waData, isPending, isError, refetch: waRefetch } = useAllWaAutomatedReplies();

  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const { t: translations } = useTranslation();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 200);

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();

    const filtered = normalizedSearch
      ? (waData || []).filter((automation) => {
          return automation.name?.toLowerCase().includes(normalizedSearch);
        })
      : waData || [];

    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [waData, debouncedSearchQuery, sortOption]);

  const isEmpty = !isPending && !isError && filteredData.length === 0;

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={() => setOpened(true)} disabled={isPending}>
              {translations("Create Chatbot")}
              <IconPlus size={16} className="ml-2" />
            </Button>
            <RefreshButton queryKeys={["allWaAutomatedReplies"]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={translations("Search chatbots...")}
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <ListPageSortDropdown value={sortOption} onChange={setSortOption} />
          </ListPageHeaderSection>
        </ListPageHeader>

        <ListPageContent
          isLoading={isPending}
          isError={isError}
          isEmpty={isEmpty}
          emptyTitle={
            debouncedSearchQuery
              ? translations("No chatbots found matching your search")
              : translations("No chatbots found")
          }
          emptyDescription={
            debouncedSearchQuery
              ? translations("Try a different search term.")
              : translations("Create your first chatbot to start automating conversations.")
          }
          onRetry={waRefetch}
        >
          <WaAutomationCards data={filteredData} detailsBasePath="/dashboard/whatsapp/flowbots" />
        </ListPageContent>
      </ListPage>

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
