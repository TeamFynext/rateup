import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Field, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { Skeleton } from "@rateup/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rateup/ui/components/table";
import { IconAdjustments } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatMoney,
  setShopMessageRates,
  type MessageCategory,
  type MessageRates,
  type ShopMessageCost,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopMessageCost } from "@/backend/commerce/shop.query";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { ShopSection } from "./ShopUi.tsx";

type Source = ShopMessageCost["sources"][number];
type T = ReturnType<typeof useTranslation>["t"];

const CATEGORIES: MessageCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION", "SERVICE"];

function categoryLabel(t: T, c: MessageCategory) {
  return {
    MARKETING: t("Marketing"),
    UTILITY: t("Utility"),
    AUTHENTICATION: t("Authentication"),
    SERVICE: t("Service"),
  }[c];
}

function sourceLabel(t: T, s: Source) {
  switch (s.kind) {
    case "campaign":
      return s.label || t("Campaign");
    case "automation":
      return t("Automations and flows");
    case "template":
      return t("One-off templates");
    case "inbox":
      return t("Inbox replies");
    case "ad":
      return s.label || t("Click-to-WhatsApp ad");
    case "instagram":
      return t("Instagram comments and stories");
  }
}

const forEachCategory = <V,>(f: (c: MessageCategory) => V): Record<MessageCategory, V> => ({
  MARKETING: f("MARKETING"),
  UTILITY: f("UTILITY"),
  AUTHENTICATION: f("AUTHENTICATION"),
  SERVICE: f("SERVICE"),
});

export const roiText = (roi: number | null) => (roi === null ? "—" : `${roi.toLocaleString()}×`);

/** What WhatsApp messaging cost next to the paid orders it brought in. */
export function MessageCostSection({ range }: Readonly<{ range: { from?: string; to?: string } }>) {
  const { t } = useTranslation();
  const canEditRates = useCan("commerce.payments.manage");
  const [editing, setEditing] = useState(false);
  const { data, isPending, isError, error } = useShopMessageCost(range);

  return (
    <ShopSection
      title={t("Messaging cost vs revenue")}
      description={
        data
          ? t(
              "Orders count towards the last campaign or automation message in the {days} days before them.",
              { days: data.attributionDays },
            )
          : undefined
      }
      actions={
        canEditRates && data ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <IconAdjustments data-icon="inline-start" />
            {t("Message rates")}
          </Button>
        ) : null
      }
      flush
    >
      {isPending ? (
        <div className="flex flex-col gap-3 px-6 pb-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <p className="px-6 pb-6 text-sm text-destructive">
          {getApiErrorMessage(error, t("Could not load messaging costs"))}
        </p>
      ) : (
        <MessageCostBody
          data={data}
          onEditRates={canEditRates ? () => setEditing(true) : undefined}
        />
      )}
      {data && (
        <RatesDialog
          open={editing}
          onOpenChange={setEditing}
          currency={data.currency}
          rates={data.rates}
          estimated={data.ratesEstimated}
        />
      )}
    </ShopSection>
  );
}

function MessageCostBody({
  data,
  onEditRates,
}: Readonly<{ data: ShopMessageCost; onEditRates?: () => void }>) {
  const { t } = useTranslation();
  const money = (n: number | null) => (n === null ? "—" : formatMoney(n, data.currency));
  const { totals } = data;

  return (
    <div className="flex flex-col gap-4">
      {data.rates === null && (
        <Alert className="mx-6 w-auto">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {t(
              "Enter what Meta charges you per message in {currency} to see what your messages cost.",
              { currency: data.currency },
            )}
            {onEditRates && (
              <Button size="sm" variant="outline" onClick={onEditRates}>
                {t("Enter rates")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 sm:grid-cols-4">
        <Stat label={t("Messaging cost")} value={money(totals.cost)} />
        <Stat label={t("Revenue from messages")} value={money(totals.attributedRevenue)} />
        <Stat label={t("Return on spend")} value={roiText(totals.roi)} />
        <Stat label={t("Billed messages")} value={totals.billableMessages.toLocaleString()} />
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-6 text-xs text-muted-foreground">
        {data.byCategory
          .filter((c) => c.billable + c.free > 0)
          .map((c) => (
            <span key={c.category}>
              {categoryLabel(t, c.category)} ·{" "}
              <span className="tabular-nums">
                {t("{billable} billed, {free} free", { billable: c.billable, free: c.free })}
              </span>
            </span>
          ))}
      </div>

      {data.sources.length === 0 ? (
        <p className="px-6 text-sm text-muted-foreground">
          {t("No WhatsApp messages or paid orders in this period.")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">{t("Source")}</TableHead>
              <TableHead className="text-right">{t("Billed messages")}</TableHead>
              <TableHead className="text-right">{t("Cost")}</TableHead>
              <TableHead className="text-right">{t("Orders")}</TableHead>
              <TableHead className="text-right">{t("Revenue")}</TableHead>
              <TableHead className="pr-6 text-right">{t("Return")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.sources.map((s) => (
              <TableRow key={s.key}>
                <TableCell className="pl-6 font-medium">{sourceLabel(t, s)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {s.billableMessages.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(s.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{s.orders}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {money(s.revenue)}
                </TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{roiText(s.roi)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="px-6 pb-6 text-xs text-muted-foreground">
        {data.ratesEstimated
          ? t(
              "Costs are estimates from typical rates. Meta prices by the customer's country and bills your WhatsApp Business account directly; enter your own rates for a closer figure.",
            )
          : t(
              "Costs use the rates you entered. Meta bills your WhatsApp Business account directly.",
            )}{" "}
        {t(
          "Replies inside the 24-hour service window are charged at the utility rate from 1 October 2026.",
        )}
      </p>
    </div>
  );
}

export function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function RatesDialog({
  open,
  onOpenChange,
  currency,
  rates,
  estimated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  rates: MessageRates | null;
  estimated: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Message rates")}</DialogTitle>
          <DialogDescription>
            {t(
              "What Meta charges you for one delivered message, in {currency}. Find your rates in WhatsApp Manager under Insights.",
              { currency },
            )}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RatesForm
            rates={rates}
            estimated={estimated}
            currency={currency}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RatesForm({
  rates,
  estimated,
  currency,
  onDone,
}: Readonly<{
  rates: MessageRates | null;
  estimated: boolean;
  currency: string;
  onDone: () => void;
}>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [values, setValues] = useState(() =>
    forEachCategory((c) => (rates ? String(rates[c]) : "")),
  );
  const save = useMutation({
    mutationFn: (next: MessageRates | null) => setShopMessageRates(next),
    onSuccess: () => {
      void invalidate();
      onDone();
    },
  });
  const parsed = forEachCategory((c) => Number(values[c]));
  const valid = CATEGORIES.every(
    (c) => values[c].trim() !== "" && parsed[c] >= 0 && parsed[c] <= 10,
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) {
          save.mutate(parsed);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((c) => (
          <Field key={c}>
            <FieldLabel htmlFor={`rate-${c}`}>{categoryLabel(t, c)}</FieldLabel>
            <Input
              id={`rate-${c}`}
              inputMode="decimal"
              placeholder="0.000"
              value={values[c]}
              onChange={(e) => setValues((v) => ({ ...v, [c]: e.target.value }))}
              aria-describedby="rates-currency"
            />
          </Field>
        ))}
      </div>
      <p id="rates-currency" className="text-xs text-muted-foreground">
        {estimated && rates
          ? t("These are typical rates, filled in as a starting point.")
          : t("Prices in {currency}.", { currency })}
      </p>
      {save.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(save.error, t("Could not save the rates"))}
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        {/* The typical rates are in USD, so only a USD store can go back to them. */}
        {!estimated && currency === "USD" && (
          <Button
            type="button"
            variant="ghost"
            disabled={save.isPending}
            onClick={() => save.mutate(null)}
          >
            {t("Use typical rates")}
          </Button>
        )}
        <Button type="submit" disabled={!valid} loading={save.isPending}>
          {t("Save rates")}
        </Button>
      </DialogFooter>
    </form>
  );
}
