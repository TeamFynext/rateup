import { IconChevronDown, IconFilter, IconGrid3x3, IconList, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { chatbotKeys, useChatbots } from "@/backend/chatbots/chatbots.query.ts";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import {
  ListPage,
  ListPageContent,
  ListPageHeader,
  ListPageHeaderSection,
  ListPageSearchInput,
  ListPageSortDropdown,
} from "@/components/common/list-page-layout.tsx";
import useDebounce from "@/components/menu/hook/useDebounce.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { examplesFor } from "@/config/chatbotExamples/index.ts";
import { AutomationPlatform } from "@/types/platform.ts";

import { ChatbotCards } from "./ChatbotCards.tsx";
import { FROM_SCRATCH } from "./CreateChatbotWizard/createChatbotWizard.steps.ts";
import { CreateChatbotWizard } from "./CreateChatbotWizard/CreateChatbotWizard.tsx";

/** The `?channel=` values; the URL says "messenger" where the API says FACEBOOK. */
export type ChatbotChannelParam = "whatsapp" | "instagram" | "messenger";

export const CHANNEL_PARAM_TO_PLATFORM: Record<ChatbotChannelParam, AutomationPlatform> = {
  whatsapp: AutomationPlatform.WHATSAPP,
  instagram: AutomationPlatform.INSTAGRAM,
  messenger: AutomationPlatform.FACEBOOK,
};

const CHANNEL_FILTERS: ReadonlyArray<{ value: ChatbotChannelParam | undefined; label: string }> = [
  { value: undefined, label: "All channels" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "messenger", label: "Messenger" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "edited", label: "Last edited" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "Name (A-Z)" },
  { value: "z-a", label: "Name (Z-A)" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/**
 * Every chatbot, on every channel: filter by channel, search, sort, grid or table, and the
 * creation wizard. Laid out like the automation rules page.
 */
export function ChatbotsPage({
  channel,
  onChannelChange,
}: Readonly<{
  channel?: ChatbotChannelParam;
  onChannelChange: (next: ChatbotChannelParam | undefined) => void;
}>) {
  const { t } = useTranslation();
  const platform = channel ? CHANNEL_PARAM_TO_PLATFORM[channel] : undefined;
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [wizard, setWizard] = useState<{ open: boolean; example?: string }>({ open: false });
  const debouncedSearch = useDebounce(search.trim(), 300);
  // The API does the name search. The channel filter is applied here, so switching it is instant.
  const { data, isPending, isError, refetch } = useChatbots(undefined, {
    search: debouncedSearch,
  });

  const chatbots = useMemo(() => {
    const rows = (data?.data ?? []).filter((chatbot) => !platform || chatbot.platform === platform);
    return rows.sort((a, b) => {
      if (sortBy === "oldest") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      if (sortBy === "edited") return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      if (sortBy === "a-z") return a.name.localeCompare(b.name);
      if (sortBy === "z-a") return b.name.localeCompare(a.name);
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  }, [data, platform, debouncedSearch, sortBy]);

  // WhatsApp chatbots are left out when the plan has no WhatsApp; say so instead of hiding it.
  const whatsappLocked =
    !!data?.locked.WHATSAPP && (!platform || platform === AutomationPlatform.WHATSAPP);
  const filterLabel = CHANNEL_FILTERS.find((f) => f.value === channel)?.label ?? "All channels";
  const isEmpty = !isPending && !isError && chatbots.length === 0;
  const starters = platform ? examplesFor(platform).slice(0, 3) : [];

  return (
    <>
      <ListPage>
        <ListPageHeader>
          <ListPageHeaderSection className="gap-3">
            <Button onClick={() => setWizard({ open: true })} loading={isPending}>
              {t("Create Chatbot")}
              <IconPlus size={16} className="ml-2" />
            </Button>
            <RefreshButton queryKeys={[...chatbotKeys.lists()]} />
          </ListPageHeaderSection>

          <ListPageHeaderSection>
            <ListPageSearchInput
              placeholder={t("Search chatbots...")}
              value={search}
              onChange={setSearch}
            />
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" className="gap-1 text-xs" />}
                >
                  <IconFilter className="h-3.5 w-3.5" />
                  {t(filterLabel)}
                  <IconChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-sm">
                  {CHANNEL_FILTERS.map((filter) => (
                    <DropdownMenuItem
                      key={filter.label}
                      onClick={() => onChannelChange(filter.value)}
                      className={filter.value === channel ? "bg-accent" : ""}
                    >
                      {t(filter.label)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="mx-1 h-5" />

              <div className="flex gap-1 rounded bg-muted p-1">
                <Button
                  onClick={() => setViewMode("grid")}
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  aria-pressed={viewMode === "grid"}
                >
                  <IconGrid3x3 className="h-4 w-4" />
                  {t("Grid")}
                </Button>
                <Button
                  onClick={() => setViewMode("list")}
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                  aria-pressed={viewMode === "list"}
                >
                  <IconList className="h-4 w-4" />
                  {t("List")}
                </Button>
              </div>
            </div>
            <ListPageSortDropdown
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              options={SORT_OPTIONS}
            />
          </ListPageHeaderSection>
        </ListPageHeader>

        {whatsappLocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {t("WhatsApp chatbots are hidden because WhatsApp isn't part of your plan.")}
            </span>
            <Button
              size="sm"
              variant="outline"
              render={<Link to="/dashboard/settings/billing" search={{ tab: "plan" }} />}
            >
              {t("See plans")}
            </Button>
          </div>
        )}

        <ListPageContent
          isLoading={isPending}
          isError={isError}
          isEmpty={isEmpty}
          emptyTitle={
            debouncedSearch ? t("No chatbots found matching your search") : t("No chatbots yet")
          }
          emptyDescription={
            debouncedSearch
              ? t("Try a different search term.")
              : starters.length
                ? t("Start from one of these, or from scratch.")
                : t("Create one for WhatsApp, Instagram or Messenger.")
          }
          onRetry={() => void refetch()}
        >
          {isEmpty && !debouncedSearch ? (
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
              <Button
                size="sm"
                onClick={() =>
                  setWizard({ open: true, example: platform ? FROM_SCRATCH : undefined })
                }
              >
                <IconPlus size={14} className="mr-1" />
                {platform ? t("Start from scratch") : t("Create Chatbot")}
              </Button>
            </div>
          ) : (
            <ChatbotCards data={chatbots} viewMode={viewMode} />
          )}
        </ListPageContent>
      </ListPage>

      {/* Mounted per opening, so a run starts from the example it was opened with. A filtered
          list opens it on that channel; the channel can still be changed in the wizard. */}
      {wizard.open && (
        <CreateChatbotWizard
          open
          onClose={() => setWizard({ open: false })}
          initialPlatform={platform}
          initialExample={wizard.example}
        />
      )}
    </>
  );
}
