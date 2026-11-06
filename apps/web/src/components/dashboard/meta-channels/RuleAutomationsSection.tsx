// A tool listing the automation rules one trigger runs for one Instagram account or Facebook
// Page — Instagram comments, story mentions, Facebook Page comments — as a dense list.

import { Button } from "@rateup/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rateup/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Switch } from "@rateup/ui/components/switch";
import { IconDots, IconPencil, IconPlus, IconTrash, type TablerIcon } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import TimeSinceText from "@/components/DateAndTime/TimeSinceText.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import type { Rule } from "@/types/rule.ts";

import { ToolStatusDot } from "./ChannelOverview.tsx";
import { ChannelSection } from "./ChannelSection.tsx";
import { matchingRules } from "./toolStatus.ts";

/** Opens the rule builder with the platform, trigger and channel already chosen. */
export function CreateRuleButton({
  platform,
  triggerEvent,
  channelId,
}: Readonly<{ platform: string; triggerEvent: string; channelId: string }>) {
  const { t } = useTranslation();
  return (
    <Button
      size="sm"
      render={
        <Link
          to="/dashboard/automation/rules/$ruleId"
          params={{ ruleId: "new" }}
          search={{ platform, triggerEvent, channel: channelId }}
        />
      }
    >
      <IconPlus data-icon="inline-start" />
      {t("Create rule")}
    </Button>
  );
}

/** What a comment rule listens to: every post, or the ones it names. */
function useRuleScope() {
  const { t } = useTranslation();
  return (rule: Rule): string | null => {
    if (rule.triggerEvent !== "INSTAGRAM_COMMENT") return null;
    const posts = rule.options?.instagramPostIds?.length ?? 0;
    return rule.options?.instagramScope === "SPECIFIC" && posts > 0
      ? t("{count, plural, one {# post} other {# posts}}", { count: posts })
      : t("All posts");
  };
}

/** One rule: its state, name, scope and last edit, the switch and its menu. */
function RuleRow({ rule }: Readonly<{ rule: Rule }>) {
  const { t } = useTranslation();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const confirm = useConfirm();
  const scope = useRuleScope()(rule);

  const remove = async () => {
    const ok = await confirm({
      title: t("Delete rule"),
      description: t("The rule stops running. This can't be undone."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) deleteMutation.mutate(rule.id);
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <ToolStatusDot tone={rule.isActive ? "live" : "idle"} />
      <div className="min-w-0 flex-1">
        <Link
          to="/dashboard/automation/rules/$ruleId"
          params={{ ruleId: rule.id }}
          className="block truncate text-sm font-medium hover:underline"
        >
          {rule.name}
        </Link>
        <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          {scope ? <span>{scope}</span> : null}
          {scope ? <span aria-hidden>·</span> : null}
          <span>
            {t("Edited")} <TimeSinceText isoDateString={rule.updatedAt} />
          </span>
        </p>
      </div>
      <Switch
        aria-label={rule.isActive ? t("Switch off") : t("Switch on")}
        checked={rule.isActive}
        onCheckedChange={() => updateMutation.mutate({ ...rule, isActive: !rule.isActive })}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={t("More actions")} />}
        >
          <IconDots className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem
            render={<Link to="/dashboard/automation/rules/$ruleId" params={{ ruleId: rule.id }} />}
          >
            <IconPencil className="size-4" />
            {t("Edit")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => void remove()}>
            <IconTrash className="size-4" />
            {t("Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export function RuleAutomationsSection({
  platform,
  triggerEvent,
  channelId,
  icon,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  platform: "INSTAGRAM" | "FACEBOOK";
  triggerEvent: string;
  /** The account (Instagram) or Page (Facebook) id picked in the page header. */
  channelId: string;
  icon: TablerIcon;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  const { t } = useTranslation();
  const { data: rules, isPending } = useRules();

  const matching = useMemo(
    () =>
      matchingRules(rules ?? [], platform, triggerEvent, channelId).sort(
        (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name),
      ),
    [rules, platform, triggerEvent, channelId],
  );
  const on = matching.filter((r) => r.isActive).length;

  const create = (
    <CreateRuleButton platform={platform} triggerEvent={triggerEvent} channelId={channelId} />
  );
  const Icon = icon;

  return (
    <ChannelSection icon={icon} title={title} description={description} actions={create}>
      {isPending ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : matching.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{create}</EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("{count, plural, one {# rule} other {# rules}} · {on} on", {
              count: matching.length,
              on,
            })}
          </p>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {matching.map((rule) => (
              <RuleRow key={rule.id} rule={rule} />
            ))}
          </ul>
        </div>
      )}
    </ChannelSection>
  );
}
