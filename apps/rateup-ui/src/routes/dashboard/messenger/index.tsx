import {
  IconBrandMessenger,
  IconHandFinger,
  IconLink,
  IconMessageDots,
  IconRobot,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import { ListPageLoading } from "@/components/common/list-page-layout.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { ChatbotList } from "@/components/dashboard/chatbots/ChatbotList.tsx";
import { MessengerCommentsTab } from "@/components/dashboard/messenger/MessengerCommentsTab.tsx";
import { MessengerProfileTab } from "@/components/dashboard/messenger/MessengerProfileTab.tsx";
import { MMeLinksTab } from "@/components/dashboard/messenger/MMeLinksTab.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export const Route = createFileRoute("/dashboard/messenger/")({
  component: MessengerChatbotsPage,
});

function MessengerChatbotsPage() {
  const { t } = useTranslation();
  const { data: pages, isPending } = useChannels(true, "FACEBOOK");
  const hasPage = (pages?.length ?? 0) > 0;
  const [selectedId, setSelectedId] = useState<string>();
  // Comments, m.me links and the welcome screen belong to one Page; the first is picked until the user chooses.
  const page = pages?.find((p) => p.id === selectedId) ?? pages?.[0];

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={t("Messenger")}
        description={t("Chatbots and links for messages sent to your Facebook Page.")}
      />

      {isPending && <ListPageLoading />}

      {!isPending && !hasPage && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconBrandMessenger className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{t("Connect a Facebook Page")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "Messenger chatbots run on a connected Facebook Page. Connect one to get started.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              render={
                <Link to="/dashboard/settings/channels/$channel" params={{ channel: "facebook" }} />
              }
            >
              {t("Connect Facebook Page")}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {!isPending && hasPage && (
        <Tabs defaultValue="chatbots">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="chatbots">
                <IconRobot className="mr-1.5 size-4" />
                {t("Chatbots")}
              </TabsTrigger>
              <TabsTrigger value="comments">
                <IconMessageDots className="mr-1.5 size-4" />
                {t("Comments")}
              </TabsTrigger>
              <TabsTrigger value="m-me-links">
                <IconLink className="mr-1.5 size-4" />
                {t("m.me Links")}
              </TabsTrigger>
              <TabsTrigger value="profile">
                <IconHandFinger className="mr-1.5 size-4" />
                {t("Welcome & Menu")}
              </TabsTrigger>
            </TabsList>
            {(pages?.length ?? 0) > 1 && (
              <Select
                value={page?.id ?? ""}
                onValueChange={(v) => setSelectedId(v ?? undefined)}
                items={(pages ?? []).map((p) => ({ value: p.id, label: p.name || p.accountId }))}
              >
                <SelectTrigger className="w-56" aria-label={t("Facebook Page")}>
                  <SelectValue placeholder={t("Select Page")} />
                </SelectTrigger>
                <SelectContent>
                  {(pages ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.accountId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <TabsContent value="chatbots" className="mt-4">
            <ChatbotList
              platform={AutomationPlatform.FACEBOOK}
              detailsBasePath="/dashboard/messenger/flowbots"
            />
          </TabsContent>
          <TabsContent value="comments" className="mt-4">
            {page && <MessengerCommentsTab pageId={page.accountId} />}
          </TabsContent>
          <TabsContent value="m-me-links" className="mt-4">
            {page && <MMeLinksTab pageId={page.accountId} />}
          </TabsContent>
          <TabsContent value="profile" className="mt-4">
            {page && <MessengerProfileTab channelId={page.id} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
