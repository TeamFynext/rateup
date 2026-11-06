import { IconInfoCircle, IconLink, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { CopyLinkButton, QrButton } from "@/components/dashboard/instagram/tabs/IgMeLinksTab.tsx";
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
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

import { mMeLink } from "./mMeLink.ts";

/** m.me links for one Page: each is an "m.me Link Opened" rule naming a ref. */
export function MMeLinksTab({ pageId }: Readonly<{ pageId: string }>) {
  const { data: rules = [] } = useRules();
  const updateMutation = useUpdateRuleMutation();
  const deleteMutation = useDeleteRuleMutation();
  const confirm = useConfirm();
  const { t } = useTranslation();

  const linkRules = useMemo(
    () =>
      rules.filter(
        (r) =>
          r.platform === "FACEBOOK" &&
          r.triggerEvent === "MESSENGER_REFERRAL" &&
          r.whatsappSettingsPhoneIds?.includes(pageId),
      ),
    [rules, pageId],
  );
  const pageLink = mMeLink(pageId);

  const remove = async (id: string) => {
    const ok = await confirm({
      title: t("Delete link"),
      description: t(
        "The link stops starting an automation. Anyone who opens it still reaches your Page in Messenger.",
      ),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) deleteMutation.mutate(id);
  };

  const create = (
    <CreateRuleButton platform="FACEBOOK" triggerEvent="MESSENGER_REFERRAL" channelId={pageId} />
  );

  return (
    <ChannelSection
      icon={IconLink}
      title={t("m.me links")}
      description={t(
        "Links that open a Messenger chat with your Page and start the automation you choose.",
      )}
      actions={create}
    >
      {/* When Meta tells us a link was opened, and so when its automation can run. */}
      <div className="flex gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <p>
          {t(
            "Someone already chatting with your Page starts the automation the moment they open the link. Someone new starts it when they tap Get Started.",
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{t("Page link")}</p>
          <p className="truncate font-mono text-sm">{pageLink}</p>
        </div>
        <CopyLinkButton link={pageLink} />
        <QrButton link={pageLink} name="page" prefix="m-me" />
      </div>

      {linkRules.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconLink className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{t("No m.me links yet")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "Create a rule for a link on your website, an ad or a QR code, and choose what happens when someone opens it.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{create}</EmptyContent>
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {linkRules.map((rule) => {
            const ref = rule.options?.messengerRef;
            const link = mMeLink(pageId, ref);
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
                </div>
                <CopyLinkButton link={link} />
                <QrButton link={link} name={ref || rule.name} prefix="m-me" />
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
