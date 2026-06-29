import {
  IconBrandInstagram,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconMenu2,
  IconMessageDots,
  IconPlus,
  IconRobot,
  IconHistory,
  IconSend,
  IconTrash,
  IconCloudUpload,
  IconCloudOff,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllInstagramAutomations } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import {
  useDeleteInstagramIceBreakersMutation,
  useDeleteInstagramPersistentMenuMutation,
  useInstagramProfile,
  useSetInstagramIceBreakersMutation,
  useSetInstagramPersistentMenuMutation,
  useSyncInstagramIceBreakersMutation,
  useSyncInstagramPersistentMenuMutation,
} from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { RuleCard } from "@/components/dashboard/automation/components/rule-card.tsx";
import {
  IceBreakersPhone,
  IgMeLinkPhone,
  PersistentMenuPhone,
} from "@/components/dashboard/instagram/instagram-preview.tsx";
import { sortData } from "@/components/dashboard/SortDropDown.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
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
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { WaAutomationCards } from "@/components/whatsapp/automation/AutomationCards.tsx";
import type { WaAutomatedReply } from "@/types/global";
import { AutomationPlatform } from "@/types/platform.ts";

import { AutomatedReplyForm } from "../../../components/dashboard/whatsapp/flowbots/create.tsx";

export const Route = createFileRoute("/dashboard/instagram/")({
  component: InstagramDashboard,
});

function InstagramDashboard() {
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
          <Button asChild>
            <Link to="/dashboard/settings">{t("Go to Settings")}</Link>
          </Button>
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
          <Select value={selectedSetting?.id ?? ""} onValueChange={(v) => setSelectedId(v)}>
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

      <Tabs defaultValue="ice-breakers">
        <TabsList>
          <TabsTrigger value="ice-breakers">
            <IconMessageDots className="mr-1.5 size-4" />
            {t("Ice Breakers")}
          </TabsTrigger>
          <TabsTrigger value="ig-me-links">
            <IconLink className="mr-1.5 size-4" />
            {t("ig.me Links")}
          </TabsTrigger>
          <TabsTrigger value="persistent-menu">
            <IconMenu2 className="mr-1.5 size-4" />
            {t("Persistent Menu")}
          </TabsTrigger>
          <TabsTrigger value="chatbots">
            <IconRobot className="mr-1.5 size-4" />
            {t("Chatbots")}
          </TabsTrigger>
          <TabsTrigger value="comments">
            <IconMessageDots className="mr-1.5 size-4" />
            {t("Private Replies")}
          </TabsTrigger>
          <TabsTrigger value="stories">
            <IconHistory className="mr-1.5 size-4" />
            {t("Story Mentions")}
          </TabsTrigger>
        </TabsList>

        {selectedSetting && (
          <>
            <TabsContent value="ice-breakers" className="mt-4">
              <IceBreakersTab
                waSettingId={selectedSetting.id}
                businessName={selectedSetting.igDisplayName || selectedSetting.igUserName || ""}
              />
            </TabsContent>
            <TabsContent value="ig-me-links" className="mt-4">
              <IgMeLinksTab
                username={selectedSetting.igUserName}
                displayName={selectedSetting.igDisplayName}
              />
            </TabsContent>
            <TabsContent value="persistent-menu" className="mt-4">
              <PersistentMenuTab
                waSettingId={selectedSetting.id}
                businessName={selectedSetting.igDisplayName || selectedSetting.igUserName || ""}
              />
            </TabsContent>
            <TabsContent value="chatbots" className="mt-4">
              <ChatbotsTab />
            </TabsContent>
            <TabsContent value="comments" className="mt-4">
              <CommentsTab />
            </TabsContent>
            <TabsContent value="stories" className="mt-4">
              <StoriesTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

interface DraftIceBreaker {
  id: string;
  question: string;
  payload: string;
}

function IceBreakersTab({
  waSettingId,
  businessName,
}: Readonly<{ waSettingId: string; businessName: string }>) {
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramIceBreakersMutation(waSettingId);
  const syncMutation = useSyncInstagramIceBreakersMutation(waSettingId);
  const deleteMutation = useDeleteInstagramIceBreakersMutation(waSettingId);
  const [items, setItems] = useState<DraftIceBreaker[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    setItems(
      data?.data.iceBreakers?.length
        ? data.data.iceBreakers.map((item) => ({
            id: crypto.randomUUID(),
            question: item.question,
            payload: item.payload,
          }))
        : [{ id: crypto.randomUUID(), question: "", payload: "" }],
    );
  }, [data]);

  const canSave = useMemo(
    () => items.some((item) => item.question.trim() || item.payload.trim()),
    [items],
  );

  const save = () => {
    const payload = items
      .map((item) => ({ question: item.question.trim(), payload: item.payload.trim() }))
      .filter((item) => item.question.length || item.payload.length)
      .slice(0, 4);
    setMutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <IconMessageDots className="size-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Ice breaker questions")}</CardTitle>
            <CardDescription>
              {t("Up to 4 starter questions shown when users open your Instagram DM.")}
            </CardDescription>
          </div>
          <PhonePreviewButton platform="instagram">
            <IceBreakersPhone items={items} businessName={businessName} />
          </PhonePreviewButton>
          <Badge variant="outline" className="text-xs tabular-nums">
            {items.length}/4
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group relative space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t("Question {number}", { number: index + 1 })}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Remove question")}</TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("Question text")}</Label>
              <Input
                value={item.question}
                placeholder={t("e.g. What are your business hours?")}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], question: e.target.value };
                  setItems(next);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("Payload")}</Label>
              <Textarea
                value={item.payload}
                placeholder={t("Payload sent when this question is tapped")}
                rows={2}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...next[index], payload: e.target.value };
                  setItems(next);
                }}
              />
            </div>
          </div>
        ))}

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItems((c) => [...c, { id: crypto.randomUUID(), question: "", payload: "" }])
            }
            disabled={items.length >= 4}
          >
            <IconPlus className="mr-1.5 size-4" />
            {t("Add question")}
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <IconCloudOff className="mr-1.5 size-4" />
            {t("Clear from Meta")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <IconCloudUpload className="mr-1.5 size-4" />
            {t("Sync with Meta")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!canSave || setMutation.isPending}
          >
            <IconSend className="mr-1.5 size-4" />
            {t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IgMeLinksTab({
  username,
  displayName,
}: Readonly<{ username?: string | null; displayName?: string | null }>) {
  const [refParam, setRefParam] = useState("campaign_2026");
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const link = useMemo(() => {
    const handle = (username || "").replace(/^@/, "").trim();
    if (!handle) return "";
    const base = `https://ig.me/m/${handle}`;
    return refParam.trim() ? `${base}?ref=${encodeURIComponent(refParam.trim())}` : base;
  }, [refParam, username]);

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
            <IconLink className="size-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Shareable ig.me link")}</CardTitle>
            <CardDescription>
              {t(
                "Generate a short link that opens a DM thread with an optional referral parameter.",
              )}
            </CardDescription>
          </div>
          <PhonePreviewButton platform="instagram">
            <IgMeLinkPhone link={link} businessName={displayName || username || ""} />
          </PhonePreviewButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("Account")}</Label>
            <Input
              value={displayName || username || ""}
              readOnly
              placeholder={t("Instagram account")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("Referral parameter")}</Label>
            <Input
              value={refParam}
              onChange={(e) => setRefParam(e.target.value)}
              placeholder={t("e.g. summer_sale")}
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("Generated link")}
          </p>
          <p className="break-all font-mono text-sm">
            {link || (
              <span className="text-muted-foreground">
                {t("Connect an Instagram account to generate a link")}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={copy} disabled={!link}>
            {copied ? (
              <IconCheck className="mr-1.5 size-4" />
            ) : (
              <IconCopy className="mr-1.5 size-4" />
            )}
            {copied ? t("Copied!") : t("Copy link")}
          </Button>
          <Button asChild variant="outline" size="sm" disabled={!link}>
            <a href={link} target="_blank" rel="noreferrer">
              <IconExternalLink className="mr-1.5 size-4" />
              {t("Open in browser")}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DraftMenuItem {
  id: string;
  type: "postback" | "web_url";
  title: string;
  payload: string;
  url: string;
}

function PersistentMenuTab({
  waSettingId,
  businessName,
}: Readonly<{ waSettingId: string; businessName: string }>) {
  const { data } = useInstagramProfile(waSettingId);
  const setMutation = useSetInstagramPersistentMenuMutation(waSettingId);
  const syncMutation = useSyncInstagramPersistentMenuMutation(waSettingId);
  const deleteMutation = useDeleteInstagramPersistentMenuMutation(waSettingId);
  const locale = "default";
  const [items, setItems] = useState<DraftMenuItem[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    const existing = data?.data.persistentMenu?.[0];
    setItems(
      existing?.call_to_actions?.length
        ? existing.call_to_actions.map((item) => ({
            id: crypto.randomUUID(),
            type: item.type,
            title: item.title,
            payload: item.payload || "",
            url: item.url || "",
          }))
        : [{ id: crypto.randomUUID(), type: "postback" as const, title: "", payload: "", url: "" }],
    );
  }, [data]);

  const canSave = useMemo(() => items.some((item) => item.title.trim().length > 0), [items]);

  const updateItem = (index: number, patch: Partial<DraftMenuItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const save = () => {
    const call_to_actions = items
      .map((item) => ({
        type: item.type,
        title: item.title.trim(),
        payload: item.type === "postback" ? item.payload.trim() : undefined,
        url: item.type === "web_url" ? item.url.trim() : undefined,
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, 5);

    setMutation.mutate([{ locale, call_to_actions }]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
            <IconMenu2 className="size-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Menu entries")}</CardTitle>
            <CardDescription>
              {t(
                "Postback items trigger in-conversation actions. Web URL items open external links. Max 5 items.",
              )}
            </CardDescription>
          </div>
          <PhonePreviewButton platform="instagram">
            <PersistentMenuPhone items={items} businessName={businessName} />
          </PhonePreviewButton>
          <Badge variant="outline" className="text-xs tabular-nums">
            {items.length}/5
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {item.type === "postback" ? t("Postback") : t("Web URL")}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">
                  {t("Item {number}", { number: index + 1 })}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    disabled={items.length <= 1}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("Remove item")}</TooltipContent>
              </Tooltip>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Type")}</Label>
                <Select
                  value={item.type}
                  onValueChange={(v: "postback" | "web_url") => updateItem(index, { type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postback">{t("Postback")}</SelectItem>
                    <SelectItem value="web_url">{t("Web URL")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Title")}</Label>
                <Input
                  value={item.title}
                  placeholder={t("e.g. Talk to an agent")}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                />
              </div>
            </div>

            {item.type === "postback" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("Payload")}</Label>
                <Textarea
                  value={item.payload}
                  placeholder={t("e.g. CARE_HELP")}
                  rows={2}
                  onChange={(e) => updateItem(index, { payload: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("URL")}</Label>
                <Input
                  value={item.url}
                  placeholder="https://example.com"
                  type="url"
                  onChange={(e) => updateItem(index, { url: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}

        <Separator />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setItems((c) => [
                ...c,
                { id: crypto.randomUUID(), type: "postback", title: "", payload: "", url: "" },
              ])
            }
            disabled={items.length >= 5}
          >
            <IconPlus className="mr-1.5 size-4" />
            {t("Add item")}
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <IconCloudOff className="mr-1.5 size-4" />
            {t("Clear from Meta")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <IconCloudUpload className="mr-1.5 size-4" />
            {t("Sync with Meta")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!canSave || setMutation.isPending}
          >
            <IconSend className="mr-1.5 size-4" />
            {t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ChatbotsTab() {
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
    <Card>
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

function CommentsTab() {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const { t } = useTranslation();

  const commentRules = useMemo(
    () => rules.filter((r) => r.platform === "INSTAGRAM" && r.triggerEvent === "INSTAGRAM_COMMENT"),
    [rules],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950">
            <IconMessageDots className="size-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Comment Automations")}</CardTitle>
            <CardDescription>
              {t("Automatically send private replies when someone comments on your posts.")}
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link to="/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_COMMENT">
              <IconPlus className="mr-1.5 size-4" />
              {t("Create")}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {commentRules.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconMessageDots className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No comment automations")}</EmptyTitle>
              <EmptyDescription>
                {t('Create an automation with the "Instagram Comment" trigger to get started.')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm">
                <Link to="/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_COMMENT">
                  <IconPlus className="mr-1.5 size-4" />
                  {t("Create automation")}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {commentRules.length > 0 && (
          <CardGrid
            items={commentRules}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <Link to={`/dashboard/automation/${item.id}`}>
                <RuleCard
                  item={item}
                  onToggleActive={() =>
                    updateMutation.mutate({ ...item, isActive: !item.isActive })
                  }
                  onDelete={(event) => {
                    event.preventDefault();
                    deleteMutation.mutate(item.id);
                  }}
                />
              </Link>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

function StoriesTab() {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const { t } = useTranslation();

  const storyMentionRules = useMemo(
    () =>
      rules.filter(
        (r) => r.platform === "INSTAGRAM" && r.triggerEvent === "INSTAGRAM_STORY_MENTION",
      ),
    [rules],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
            <IconHistory className="size-4.5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Story Mention Automations")}</CardTitle>
            <CardDescription>
              {t("Triggered when someone mentions your account in their Instagram story.")}
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link to="/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_STORY_MENTION">
              <IconPlus className="mr-1.5 size-4" />
              {t("Create")}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {storyMentionRules.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconHistory className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No story mention automations")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  'Create an automation with the "Instagram Story Mention" trigger to get started.',
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm">
                <Link to="/dashboard/automation/new?platform=INSTAGRAM&triggerEvent=INSTAGRAM_STORY_MENTION">
                  <IconPlus className="mr-1.5 size-4" />
                  {t("Create automation")}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {storyMentionRules.length > 0 && (
          <CardGrid
            items={storyMentionRules}
            getKey={(item) => item.id}
            renderItem={(item) => (
              <Link to={`/dashboard/automation/${item.id}`}>
                <RuleCard
                  item={item}
                  onToggleActive={() =>
                    updateMutation.mutate({ ...item, isActive: !item.isActive })
                  }
                  onDelete={(event) => {
                    event.preventDefault();
                    deleteMutation.mutate(item.id);
                  }}
                />
              </Link>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
