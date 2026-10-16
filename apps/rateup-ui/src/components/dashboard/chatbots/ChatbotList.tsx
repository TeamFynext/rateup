import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllWaAutomatedReplies } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import {
  metaAutomationListKey,
  useAllMetaAutomations,
} from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
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
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards.tsx";
import { examplesFor } from "@/config/chatbotExamples/index.ts";
import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";

import { FROM_SCRATCH } from "./CreateChatbotWizard/createChatbotWizard.steps.ts";
import { CreateChatbotWizard } from "./CreateChatbotWizard/CreateChatbotWizard.tsx";

interface ChatbotListProps {
  platform: AutomationPlatform;
  /** Where a card opens, e.g. "/dashboard/messenger/flowbots". */
  detailsBasePath: string;
}

/** One channel's chatbots: search, sort, cards, and the creation wizard. */
export function ChatbotList(props: Readonly<ChatbotListProps>) {
  // Each channel reads its own endpoint; the WhatsApp one is gated on the WhatsApp plan, so
  // an Instagram or Messenger page must not call it.
  return props.platform === AutomationPlatform.WHATSAPP ? (
    <WhatsAppChatbotList {...props} />
  ) : (
    <MetaChatbotList {...props} platform={props.platform} />
  );
}

function WhatsAppChatbotList(props: Readonly<ChatbotListProps>) {
  const query = useAllWaAutomatedReplies();
  return <ChatbotListView {...props} query={query} refreshKey={["allWaAutomatedReplies"]} />;
}

function MetaChatbotList(
  props: Readonly<
    ChatbotListProps & { platform: AutomationPlatform.INSTAGRAM | AutomationPlatform.FACEBOOK }
  >,
) {
  const query = useAllMetaAutomations(props.platform);
  return (
    <ChatbotListView
      {...props}
      query={query}
      refreshKey={[...metaAutomationListKey(props.platform)]}
    />
  );
}

function ChatbotListView({
  platform,
  detailsBasePath,
  query,
  refreshKey,
}: Readonly<
  ChatbotListProps & {
    query: {
      data: WaAutomatedReply[] | undefined;
      isPending: boolean;
      isError: boolean;
      refetch: () => unknown;
    };
    refreshKey: string[];
  }
>) {
  const { t } = useTranslation();
  const [wizard, setWizard] = useState<{ open: boolean; example?: string }>({ open: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("latest");
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 200);
  const { data, isPending, isError, refetch } = query;

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const normalizedSearch = debouncedSearchQuery.toLowerCase();
    const filtered = normalizedSearch
      ? (data || []).filter((automation) =>
          automation.name?.toLowerCase().includes(normalizedSearch),
        )
      : data || [];
    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [data, debouncedSearchQuery, sortOption]);

  const isEmpty = !isPending && !isError && filteredData.length === 0;
  const starters = examplesFor(platform).slice(0, 3);

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={() => setWizard({ open: true })} loading={isPending}>
              {t("Create Chatbot")}
              <IconPlus size={16} className="ml-2" />
            </Button>
            <RefreshButton queryKeys={refreshKey} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={t("Search chatbots...")}
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
              ? t("No chatbots found matching your search")
              : t("No chatbots yet")
          }
          emptyDescription={
            debouncedSearchQuery
              ? t("Try a different search term.")
              : t("Start from one of these, or from scratch.")
          }
          onRetry={() => void refetch()}
        >
          {isEmpty && !debouncedSearchQuery ? (
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((example) => (
                <Button
                  key={example.key}
                  variant="outline"
                  size="sm"
                  onClick={() => setWizard({ open: true, example: example.key })}
                >
                  {t(example.name)}
                </Button>
              ))}
              <Button size="sm" onClick={() => setWizard({ open: true, example: FROM_SCRATCH })}>
                <IconPlus size={14} className="mr-1" />
                {t("Start from scratch")}
              </Button>
            </div>
          ) : (
            <WaAutomationCards data={filteredData} detailsBasePath={detailsBasePath} />
          )}
        </ListPageContent>
      </ListPage>

      {/* Mounted per opening, so a run starts from the example it was opened with. */}
      {wizard.open && (
        <CreateChatbotWizard
          open
          onClose={() => setWizard({ open: false })}
          platform={platform}
          initialExample={wizard.example}
        />
      )}
    </>
  );
}
