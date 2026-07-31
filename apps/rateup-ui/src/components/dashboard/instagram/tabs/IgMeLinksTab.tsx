// Extracted verbatim from `InstagramDashboard.tsx`. Behaviour is unchanged.

import { IconCheck, IconCopy, IconExternalLink, IconLink } from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { IgMeLinkPhone } from "@/components/dashboard/instagram/instagram-preview.tsx";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { PhonePreviewButton } from "@/components/ui/phone-preview.tsx";
import { cn } from "@/lib/utils.ts";

export function IgMeLinksTab({
  username,
  displayName,
}: Readonly<{ username?: string | null; displayName?: string | null }>) {
  const uid = useId();
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
          <Field>
            <FieldLabel htmlFor={`${uid}-field-3`} className="text-xs text-muted-foreground">
              {t("Account")}
            </FieldLabel>
            <Input
              id={`${uid}-field-3`}
              value={displayName || username || ""}
              readOnly
              placeholder={t("Instagram account")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${uid}-field-4`} className="text-xs text-muted-foreground">
              {t("Referral parameter")}
            </FieldLabel>
            <Input
              id={`${uid}-field-4`}
              value={refParam}
              onChange={(e) => setRefParam(e.target.value)}
              placeholder={t("e.g. summer_sale")}
            />
          </Field>
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
          <a
            href={link || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!link}
            tabIndex={link ? undefined : -1}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              // `disabled:` variants only match real form controls, so an anchor needs
              // the disabled look and click-blocking spelled out.
              !link && "pointer-events-none opacity-50",
            )}
          >
            <IconExternalLink className="mr-1.5 size-4" />
            {t("Open in browser")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
