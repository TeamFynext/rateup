import { IconGift, IconTicket, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

import type { RewardFormRow } from "../../schemas.ts";

/**
 * Coupons and free gifts are listed with the point rewards — they answer the same customer
 * question — but their fields live in another dialect, so they are edited in the full
 * editor. The row still saves through untouched, so a Save here never loses them.
 */
export function ReadOnlyRewardRow({
  row,
  pointsName,
  advancedEditorHref,
  onRemove,
}: Readonly<{
  row: RewardFormRow | undefined;
  pointsName: string;
  advancedEditorHref?: React.ReactNode;
  onRemove: () => void;
}>) {
  const { t } = useTranslation();
  if (!row) return null;
  const isCoupon = row.rewardType === "coupon";
  const Icon = isCoupon ? IconTicket : IconGift;
  const value = row.rewardValue as {
    code?: unknown;
    discountValue?: unknown;
    discountType?: unknown;
  };

  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border",
            isCoupon
              ? "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700 dark:border-ru-amber-700/40 dark:bg-ru-amber-700/20 dark:text-ru-amber-300"
              : "border-ru-green-100 bg-ru-green-50 text-ru-green-700 dark:border-ru-green-700/40 dark:bg-ru-green-700/20 dark:text-ru-green-300",
          )}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            <Badge variant="outline">{isCoupon ? t("Coupon code") : t("Free gift")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isCoupon
              ? typeof value.code === "string" && value.code
                ? t("Code {code} · staff type it at the counter", { code: value.code })
                : t("No {points} needed — staff type the code at the counter", {
                    points: pointsName,
                  })
              : t("Handed to a named customer with a code")}
            {advancedEditorHref ? <> · {advancedEditorHref}</> : null}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("Remove reward")}
          onClick={onRemove}
        >
          <IconTrash size={16} />
        </Button>
      </CardContent>
    </Card>
  );
}
