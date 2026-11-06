import { IconExternalLink } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { ShopMetaSyncStatus } from "@/backend/commerce/shop.api";
import { BackLink } from "@/components/common/back-link.tsx";
import { CopyButton } from "@/components/common/copy-button.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";

import { SHOP_PATHS, type SettingsTab, type Tone } from "./shopMeta.ts";

/** The page frame every shop screen shares. */
export function ShopPage({
  title,
  description,
  actions,
  back,
  badges,
  children,
}: Readonly<{
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
  /** Status chips beside the title, for a detail page. */
  badges?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      {back ? <BackLink to={back.to} label={back.label} /> : null}
      <PageHeading
        title={title}
        description={
          badges ? (
            <span className="flex flex-wrap items-center gap-2">
              {badges}
              {description ? <span>{description}</span> : null}
            </span>
          ) : (
            description
          )
        }
        actions={
          actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null
        }
      />
      {children}
    </div>
  );
}

const toneBadge = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        ok: "bg-green-600/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
        warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
        info: "bg-primary/10 text-primary",
        mute: "bg-muted text-muted-foreground",
        err: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { tone: "mute" },
  },
);

export function ToneBadge({
  tone,
  children,
  className,
}: Readonly<{ tone: Tone; children: ReactNode; className?: string }> &
  VariantProps<typeof toneBadge>) {
  return <span className={cn(toneBadge({ tone }), className)}>{children}</span>;
}

const syncDot = cva("inline-block size-2 shrink-0 rounded-full", {
  variants: {
    status: {
      LIVE: "bg-green-600 dark:bg-green-500",
      SYNCING: "animate-pulse bg-amber-500 dark:bg-amber-400",
      REJECTED: "bg-destructive",
      HIDDEN: "bg-muted-foreground/40",
      // Hollow, so "never published" reads differently from "switched off".
      NOT_SYNCED: "border-[1.5px] border-muted-foreground bg-transparent",
    },
  },
});

export function SyncDot({ status }: Readonly<{ status: ShopMetaSyncStatus }>) {
  return <span aria-hidden className={syncDot({ status })} />;
}

/** What a sync state means for the merchant, in the words the legend and tooltips share. */
export function syncExplanation(
  t: TFunction,
  status: ShopMetaSyncStatus,
  error?: string | null,
): string {
  switch (status) {
    case "LIVE":
      return t("Live in your Meta catalog");
    case "SYNCING":
      return t("Publishing to your Meta catalog. This usually takes under a minute.");
    case "REJECTED":
      return error
        ? t("Rejected by Meta — {reason}", { reason: error })
        : t("Rejected by Meta. Open the product to see why.");
    case "HIDDEN":
      return t("Hidden from the catalog because it is off for this channel, a draft or sold out.");
    case "NOT_SYNCED":
      return t(
        "Not on WhatsApp yet. Connect your Meta catalog in Commerce → Settings → Store, then publish again.",
      );
  }
}

export function syncLabel(t: TFunction, status: ShopMetaSyncStatus): string {
  switch (status) {
    case "LIVE":
      return t("Live");
    case "SYNCING":
      return t("Syncing");
    case "REJECTED":
      return t("Rejected by Meta");
    case "HIDDEN":
      return t("Hidden");
    case "NOT_SYNCED":
      return t("Not synced");
  }
}

/** A product's catalog state as a chip with its explanation on hover, for the editor. */
export function SyncStatusChip({
  status,
  error,
}: Readonly<{ status: ShopMetaSyncStatus; error?: string | null }>) {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2 text-xs font-semibold whitespace-nowrap text-foreground"
          />
        }
      >
        <SyncDot status={status} />
        {syncLabel(t, status)}
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{syncExplanation(t, status, error)}</TooltipContent>
    </Tooltip>
  );
}

/** One channel chip on a product row. Meta channels carry the catalog sync state; off means grey. */
export function ChannelChip({
  label,
  on,
  status,
  error,
}: Readonly<{ label: string; on: boolean; status: ShopMetaSyncStatus; error?: string | null }>) {
  const { t } = useTranslation();
  const effective: ShopMetaSyncStatus = on ? status : "HIDDEN";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border px-1.5 text-xs font-medium text-foreground"
          />
        }
      >
        <SyncDot status={effective} />
        {label}
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {on ? syncExplanation(t, status, error) : t("Off for this channel")}
      </TooltipContent>
    </Tooltip>
  );
}

/** A link to one tab of Commerce → Settings, where every fix-it message sends the merchant. */
export function SettingsTabLink({
  tab,
  children,
  className,
}: Readonly<{ tab: SettingsTab; children: ReactNode; className?: string }>) {
  return (
    <Link
      to={SHOP_PATHS.settings}
      search={{ tab }}
      className={cn("font-semibold text-primary underline-offset-2 hover:underline", className)}
    >
      {children}
    </Link>
  );
}

export function useOpenShopSettings() {
  const navigate = useNavigate();
  return (tab: SettingsTab) => void navigate({ to: SHOP_PATHS.settings, search: { tab } });
}

/** A link the merchant copies or opens: checkout links, test orders. */
export function LinkField({ url, label }: Readonly<{ url: string; label: string }>) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} aria-label={label} className="font-mono text-xs" />
      <CopyButton value={url} label={t("Copy")} variant="outline" />
      <Button
        variant="outline"
        size="icon"
        aria-label={t("Open link")}
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      >
        <IconExternalLink />
      </Button>
    </div>
  );
}

/** A titled card section, the unit every shop form and detail column is built from. */
export function ShopSection({
  title,
  description,
  actions,
  children,
  className,
  flush,
  id,
}: Readonly<{
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Content runs edge to edge (tables). */
  flush?: boolean;
}>) {
  return (
    <Card id={id} className={cn("scroll-mt-4 gap-4", flush && "pb-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-base font-bold tracking-tight">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className={cn(!flush && "px-6")}>{children}</div> : null}
    </Card>
  );
}

/** A label-left, control-right settings row. */
export function SettingRow({
  title,
  description,
  control,
  children,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {description ? (
            <span className="text-sm text-muted-foreground">{description}</span>
          ) : null}
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

/** A label/value pair inside a detail card. */
export function KeyValue({ label, children }: Readonly<{ label: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-foreground">{children}</span>
    </div>
  );
}

export function downloadText(text: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductThumb({
  src,
  name,
  size = "md",
}: Readonly<{ src?: string | null; name: string; size?: "md" | "lg" }>) {
  const box = size === "lg" ? "size-12" : "size-10";
  if (src)
    return (
      <img
        src={src}
        alt=""
        className={cn(box, "shrink-0 rounded-lg border border-border object-cover")}
      />
    );
  return (
    <span
      className={cn(
        box,
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary",
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Discard/Save for a settings card that saves on its own. */
export function SectionSave({
  dirty,
  saving,
  onSave,
  onReset,
}: Readonly<{ dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }>) {
  const { t } = useTranslation();
  if (!dirty && !saving) return null;
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="ghost" onClick={onReset}>
        {t("Discard")}
      </Button>
      <Button type="button" size="sm" loading={saving} onClick={onSave}>
        {t("Save")}
      </Button>
    </div>
  );
}
