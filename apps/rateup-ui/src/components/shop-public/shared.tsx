import { IconBuildingStore, IconMinus, IconPlus } from "@tabler/icons-react";
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
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-0.5">
      <Button
        type="button"
        variant="ghost"
        size={buttonSize}
        className="rounded-full"
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
        className="rounded-full"
        aria-label={t("More {item}", { item: label })}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <IconPlus />
      </Button>
    </div>
  );
}
