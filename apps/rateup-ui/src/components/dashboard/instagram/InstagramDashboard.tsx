// Extracted verbatim from the `/dashboard/instagram/` route so the route file carries routing
// config only. Behaviour is unchanged.

import {
  IconBrandInstagram,
  IconMenu2,
  IconMessageDots,
  IconMessageQuestion,
  IconRobot,
  IconHistory,
  IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Badge } from "@/components/ui/badge.tsx";
import { buttonVariants } from "@/components/ui/button.tsx";
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
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import { ChatbotsTab } from "./tabs/ChatbotsTab.tsx";
import { CommentsTab } from "./tabs/CommentsTab.tsx";
import { IceBreakersTab } from "./tabs/IceBreakersTab.tsx";
import { IgMeLinksTab } from "./tabs/IgMeLinksTab.tsx";
import { PersistentMenuTab } from "./tabs/PersistentMenuTab.tsx";
import { StoriesTab } from "./tabs/StoriesTab.tsx";

export function InstagramDashboard() {
  const { data: waSettings, isLoading } = useWaSettings();
  const { t } = useTranslation();

  const connectedSettings = useMemo(
    () => waSettings?.filter((s) => s.ibaId?.length) ?? [],
    [waSettings],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedId && connectedSettings[0]?.id) {
      setSelectedId(connectedSettings[0].id);
    }
  }, [connectedSettings, selectedId]);

  const selectedSetting = connectedSettings.find((s) => s.id === selectedId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (connectedSettings.length === 0) {
    return (
      <Empty className="min-h-96">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBrandInstagram className="size-6" />
          </EmptyMedia>
          <EmptyTitle>{t("No Instagram accounts connected")}</EmptyTitle>
          <EmptyDescription>
            {t(
              "Connect an Instagram Business account to manage ice breakers, chatbots, comment automations, and more.",
            )}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/dashboard/settings/channels" className={buttonVariants()}>
            {t("Go to Settings")}
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-pink-500 text-white">
            <IconBrandInstagram className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight">{t("Instagram")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Manage automations, menus, and engagement tools")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedSetting?.id ?? ""}
            onValueChange={(v) => setSelectedId(v ?? undefined)}
            items={connectedSettings.map((s) => ({
              value: s.id,
              label: s.igDisplayName || s.igUserName || s.phoneDisplayName || s.phone,
            }))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("Select account")} />
            </SelectTrigger>
            <SelectContent>
              {connectedSettings.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <IconBrandInstagram className="size-3.5 text-muted-foreground" />
                    {s.igDisplayName || s.igUserName || s.phoneDisplayName || s.phone}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">
            {t("{count} connected", { count: connectedSettings.length })}
          </Badge>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="chatbots">
        <TabsList>
          <TabsTrigger value="chatbots">
            <IconRobot className="mr-1.5 size-4" />
            {t("Chatbots")}
          </TabsTrigger>
          <TabsTrigger value="comments">
            <IconMessageDots className="mr-1.5 size-4" />
            {t("Comments")}
          </TabsTrigger>
          <TabsTrigger value="stories">
            <IconHistory className="mr-1.5 size-4" />
            {t("Story Mentions")}
          </TabsTrigger>
          <TabsTrigger value="persistent-menu">
            <IconMenu2 className="mr-1.5 size-4" />
            {t("Persistent Menu")}
          </TabsTrigger>
          <TabsTrigger value="ice-breakers">
            <IconMessageQuestion className="mr-1.5 size-4" />
            {t("Ice Breakers")}
          </TabsTrigger>
          <TabsTrigger value="ig-me-links">
            <IconLink className="mr-1.5 size-4" />
            {t("ig.me Links")}
          </TabsTrigger>
        </TabsList>

        {selectedSetting?.ibaId && (
          <>
            <TabsContent value="chatbots" className="mt-4">
              <ChatbotsTab />
            </TabsContent>
            <TabsContent value="comments" className="mt-4">
              <CommentsTab ibaId={selectedSetting.ibaId} />
            </TabsContent>
            <TabsContent value="stories" className="mt-4">
              <StoriesTab ibaId={selectedSetting.ibaId} />
            </TabsContent>
            <TabsContent value="persistent-menu" className="mt-4">
              <PersistentMenuTab
                waSettingId={selectedSetting.id}
                businessName={selectedSetting.igDisplayName || selectedSetting.igUserName || ""}
              />
            </TabsContent>
            <TabsContent value="ice-breakers" className="mt-4">
              <IceBreakersTab
                waSettingId={selectedSetting.id}
                businessName={selectedSetting.igDisplayName || selectedSetting.igUserName || ""}
              />
            </TabsContent>
            <TabsContent value="ig-me-links" className="mt-4">
              <IgMeLinksTab
                ibaId={selectedSetting.ibaId}
                username={selectedSetting.igUserName}
                displayName={selectedSetting.igDisplayName}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
