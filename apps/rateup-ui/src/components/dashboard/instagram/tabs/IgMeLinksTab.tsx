import {
  IconCheck,
  IconCopy,
  IconInfoCircle,
  IconLink,
  IconQrcode,
  IconTrash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useInstagramLinkStats } from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { igMeLink } from "@/components/dashboard/instagram/igMeLink.ts";
import { downloadIgMeQr } from "@/components/dashboard/instagram/igMeQr.ts";
import { IgMeLinkPhone } from "@/components/dashboard/instagram/instagram-preview.tsx";
import { ChannelSection } from "@/components/dashboard/meta-channels/ChannelSection.tsx";
import { CreateRuleButton } from "@/components/dashboard/meta-channels/RuleAutomationsSection.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

/** Copies a link, confirming for a moment. Shared with the Messenger m.me links tab. */
export function CopyLinkButton({ link }: Readonly<{ link: string }>) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!link}>
      {copied ? <IconCheck className="mr-1.5 size-4" /> : <IconCopy className="mr-1.5 size-4" />}
      {copied ? t("Copied!") : t("Copy link")}
    </Button>
  );
}

/** Downloads the link as a QR code; `prefix` starts the file name. */
export function QrButton({
  link,
  name,
  prefix,
}: Readonly<{ link: string; name: string; prefix?: string }>) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!link}
      onClick={() => void downloadIgMeQr(link, name, prefix)}
    >
      <IconQrcode className="mr-1.5 size-4" />
      {t("QR code")}
    </Button>
  );
}

/** "12 opens · 9 people", or nothing while the link has none. */
function LinkStats({ opens, people }: Readonly<{ opens: number; people: number }>) {
  const { t } = useTranslation();
  if (!opens) return <span className="text-xs text-muted-foreground">{t("No opens yet")}</span>;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {t(
        "{opens, plural, one {# open} other {# opens}} · {people, plural, one {# person} other {# people}}",
        {
          opens,
          people,
        },
      )}
    </span>
  );
}

/** ig.me links for one account: each is an "ig.me Link Opened" rule naming a ref. */
export function IgMeLinksTab({
  ibaId,
  username,
  displayName,
}: Readonly<{ ibaId: string; username?: string | null; displayName?: string | null }>) {
  const { data: rules = [] } = useRules();
  const { data: stats } = useInstagramLinkStats(ibaId);
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const confirm = useConfirm();
  const { t } = useTranslation();

  const linkRules = useMemo(
    () =>
      rules.filter(
        (r) =>
          r.platform === "INSTAGRAM" &&
          r.triggerEvent === "INSTAGRAM_REFERRAL" &&
          r.whatsappSettingsPhoneIds?.includes(ibaId),
      ),
    [rules, ibaId],
  );
  const profileLink = igMeLink(username);
  const create = (
    <CreateRuleButton platform="INSTAGRAM" triggerEvent="INSTAGRAM_REFERRAL" channelId={ibaId} />
  );

  const remove = async (id: string) => {
    const ok = await confirm({
      title: t("Delete link"),
      description: t(
        "The link stops starting an automation. Anyone who opens it still reaches your DMs.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) deleteMutation.mutate(id);
  };

  return (
    <ChannelSection
      icon={IconLink}
      title={t("ig.me links")}
      description={t("Links that open a DM with you and start the automation you choose.")}
      actions={
        <>
          <PhonePreviewButton platform="instagram">
            <IgMeLinkPhone link={profileLink} businessName={displayName || username || ""} />
          </PhonePreviewButton>
          {create}
        </>
      }
    >
      {/* When Meta tells us a link was opened, and so when its automation can run. */}
      <div className="flex gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <p>
          {t(
            "Someone already chatting with you starts the automation the moment they open the link. Someone new starts it with their first message, or by tapping an ice breaker. ig.me links open in the Instagram app, not on Instagram on the web.",
          )}
        </p>
      </div>
      {profileLink && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{t("Profile link")}</p>
            <p className="truncate font-mono text-sm">{profileLink}</p>
          </div>
          <CopyLinkButton link={profileLink} />
          <QrButton link={profileLink} name={username ?? "profile"} />
        </div>
      )}

      {linkRules.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconLink className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{t("No ig.me links yet")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "Create a rule for a link in your bio, a story or an ad, and choose what happens when someone opens it.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{create}</EmptyContent>
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {linkRules.map((rule) => {
            const ref = rule.options?.instagramRef;
            const link = igMeLink(username, ref);
            const linkStats = ref ? stats?.get(ref.toLowerCase()) : undefined;
            return (
              <li key={rule.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/dashboard/automation/rules/$ruleId"
                    params={{ ruleId: rule.id }}
                    className="font-medium hover:underline"
                  >
                    {rule.name}
                  </Link>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-xs text-muted-foreground">{link}</span>
                    {!ref && <Badge variant="secondary">{t("Any link")}</Badge>}
                  </div>
                  {ref && (
                    <LinkStats opens={linkStats?.opens ?? 0} people={linkStats?.people ?? 0} />
                  )}
                </div>
                <CopyLinkButton link={link} />
                <QrButton link={link} name={ref || rule.name} />
                <Switch
                  aria-label={t("Active")}
                  checked={rule.isActive}
                  onCheckedChange={() =>
                    updateMutation.mutate({ ...rule, isActive: !rule.isActive })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("Delete link")}
                  onClick={() => void remove(rule.id)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </ChannelSection>
  );
}
