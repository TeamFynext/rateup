// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

import { IconPlus, IconRobot } from "@tabler/icons-react";
import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { AutomatedReplyForm } from "@/components/dashboard/whatsapp/flowbots/create.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards.tsx";
import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";

export function ChatbotsTab() {
  const {
    data: igData,
    isPending: igPending,
    isError: igError,
    refetch: igRefetch,
  } = useAllInstagramAutomations();

  const [opened, setOpened] = useState(false);
  const [sortOption] = useState("latest");
  const { t } = useTranslation();

  const filteredData = useMemo<WaAutomatedReply[]>(() => {
    const filtered = igData || [];
    return sortData(filtered, sortOption) as WaAutomatedReply[];
  }, [igData, sortOption]);

  const isEmpty = !igPending && !igError && filteredData.length === 0;

  return (
    <Card className="bg-ink-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
            <IconRobot className="size-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Instagram Chatbots")}</CardTitle>
            <CardDescription>
              {t("Create and manage chatbots, triggers, and handoff flows.")}
            </CardDescription>
          </div>
          <Button onClick={() => setOpened(true)} size="sm">
            <IconPlus className="mr-1.5 size-4" />
            {t("Create Chatbot")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {igPending && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="size-8 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {igError && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertCircle className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("Failed to load chatbots")}</EmptyTitle>
              <EmptyDescription>{t("Something went wrong. Please try again.")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => void igRefetch()}>
                {t("Retry")}
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {isEmpty && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconRobot className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No chatbots yet")}</EmptyTitle>
              <EmptyDescription>
                {t("Create your first chatbot to start automating Instagram conversations.")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setOpened(true)}>
                <IconPlus className="mr-1.5 size-4" />
                {t("Create Chatbot")}
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {!igPending && !igError && filteredData.length > 0 && (
          <WaAutomationCards data={filteredData} detailsBasePath="/dashboard/instagram/flowbots" />
        )}
      </CardContent>

      <Dialog open={opened} onOpenChange={setOpened}>
        <DialogContent className="sm:max-w-175">
          <DialogHeader>
            <DialogTitle>{t("Create Chatbot")}</DialogTitle>
          </DialogHeader>
          <AutomatedReplyForm
            close={() => setOpened(false)}
            platform={AutomationPlatform.INSTAGRAM}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
