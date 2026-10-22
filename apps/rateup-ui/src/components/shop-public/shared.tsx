import { IconBrandWhatsapp, IconBuildingStore, IconMinus, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

import { whatsappLink } from "./catalog.ts";

/** Widens a small control's tap area to 44px without changing how it looks. */
export const TAP_AREA = "relative after:absolute after:-inset-1.5 after:content-['']";

/**
 * "Message the shop" on WhatsApp, wherever the copy tells the shopper to get in touch.
 * Renders nothing when the shop has no WhatsApp number.
 */
export function MessageShopButton({
  whatsappNumber,
  text,
  label,
  variant = "outline",
  className,
}: Readonly<{
  whatsappNumber: string | null | undefined;
  /** Prefilled, so the shop knows which order or problem the message is about. */
  text?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost";
  className?: string;
}>) {
  const { t } = useTranslation();
  if (!whatsappNumber) return null;
  return (
    <Button
      variant={variant}
      className={cn("h-11 rounded-xl", className)}
      render={<a href={whatsappLink(whatsappNumber, text)} target="_blank" rel="noreferrer" />}
    >
      <IconBrandWhatsapp />
      {label ?? t("Message the shop")}
    </Button>
  );
}

/** Whether dark text reads better than white on this hex colour (WCAG relative luminance). */
export function prefersDarkText(hex: string | null | undefined): boolean {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex?.trim() ?? "");
  if (!match) return false;
  const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // The luminance where white and near-black text have equal contrast.
  return luminance > 0.179;
}

export function StoreAvatar({
  name,
  logoUrl,
  className,
}: Readonly<{ name: string; logoUrl: string | null; className?: string }>) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn("size-18 shrink-0 rounded-full border border-border object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-18 shrink-0 items-center justify-center rounded-full bg-ru-blue-900 font-display text-2xl font-extrabold text-ru-amber-300",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "·"}
    </span>
  );
}

/** The full-page "nothing here" state shared by the storefront and the checkout. */
export function ShopUnavailable({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children?: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Empty className="max-w-md bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBuildingStore />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {children}
      </Empty>
    </main>
  );
}

export function PriceTag({
  price,
  compareAt,
  currency,
  className,
}: Readonly<{ price: number; compareAt?: number | null; currency: string; className?: string }>) {
  const discounted = compareAt != null && compareAt > price;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      <span className="font-bold text-foreground">{formatMoney(price, currency)}</span>
      {discounted && (
        <s className="text-xs text-muted-foreground">{formatMoney(compareAt, currency)}</s>
      )}
    </span>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = "default",
}: Readonly<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** What is being counted, for the buttons' accessible names. */
  label: string;
  size?: "sm" | "default";
}>) {
  const { t } = useTranslation();
  const buttonSize = size === "sm" ? "icon-xs" : "icon-sm";
  const tap =
    size === "sm" ? "relative after:absolute after:-inset-2.5 after:content-['']" : TAP_AREA;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-0.5">
      <Button
        type="button"
        variant="ghost"
        size={buttonSize}
        className={cn("rounded-full", tap)}
        aria-label={t("Fewer {item}", { item: label })}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <IconMinus />
      </Button>
      <span
        className={cn("min-w-6 text-center font-semibold tabular-nums", size === "sm" && "text-xs")}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={buttonSize}
        className={cn("rounded-full", tap)}
        aria-label={t("More {item}", { item: label })}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <IconPlus />
      </Button>
    </div>
  );
}
