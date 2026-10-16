import { IconBrandMessenger } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import { ListPageLoading } from "@/components/common/list-page-layout.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { ChatbotList } from "@/components/dashboard/chatbots/ChatbotList.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export const Route = createFileRoute("/dashboard/messenger/")({
  component: MessengerChatbotsPage,
});

function MessengerChatbotsPage() {
  const { t } = useTranslation();
  const { data: pages, isPending } = useChannels(true, "FACEBOOK");
  const hasPage = (pages?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={t("Messenger")}
        description={t("Chatbots that answer messages sent to your Facebook Page.")}
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
        <ChatbotList
          platform={AutomationPlatform.FACEBOOK}
          detailsBasePath="/dashboard/messenger/flowbots"
        />
      )}
    </div>
  );
}
