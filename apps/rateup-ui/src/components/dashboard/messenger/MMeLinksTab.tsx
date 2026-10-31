import { IconInfoCircle, IconLink, IconPlus, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useDeleteRuleMutation,
  useRules,
  useUpdateRuleMutation,
} from "@/backend/whatsapp/rule/rule.query";
import { CopyLinkButton, QrButton } from "@/components/dashboard/instagram/tabs/IgMeLinksTab.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
  const createSearch = {
    platform: "FACEBOOK",
    triggerEvent: "MESSENGER_REFERRAL",
    channel: pageId,
  } as const;

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

  const createButton = (
    <Button
      size="sm"
      render={
        <Link
          to="/dashboard/automation/rules/$ruleId"
          params={{ ruleId: "new" }}
          search={createSearch}
        />
      }
    >
      <IconPlus className="mr-1.5 size-4" />
      {t("Create link")}
    </Button>
  );

  return (
    <Card className="bg-ru-n-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <IconLink className="size-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("m.me links")}</CardTitle>
            <CardDescription>
              {t(
                "Links that open a Messenger chat with your Page and start the automation you choose.",
              )}
            </CardDescription>
          </div>
          {createButton}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconLink className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{t("No m.me links yet")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  "Create a link for your website, an ad or a QR code, and choose what happens when someone opens it.",
                )}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>{createButton}</EmptyContent>
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
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {link}
                      </span>
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
      </CardContent>
    </Card>
  );
}
