import { useTranslation } from "react-i18next";

import { formatMoney, type ShopAdReport } from "@/backend/commerce/shop.api";
import { useShopAdReport } from "@/backend/commerce/shop.query";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { safeHref } from "@/utils/safeHref.ts";

import { roiText, Stat } from "./MessageCostSection.tsx";
import { ShopSection } from "./ShopUi.tsx";

/** Click-to-WhatsApp ads next to what their chats cost and sold. Hidden for a shop running none. */
export function AdReportSection({ range }: Readonly<{ range: { from?: string; to?: string } }>) {
  const { t } = useTranslation();
  const { data, isPending } = useShopAdReport(range);
  if (!isPending && !data?.ads.length) return null;

  return (
    <ShopSection
      title={t("Click-to-WhatsApp ads")}
      description={
        data
          ? t(
              "A sale counts towards the last ad the customer clicked in the {days} days before it. Cost is what the messages to them in that week cost.",
              { days: data.attributionDays },
            )
          : undefined
      }
      flush
    >
      {isPending || !data ? (
        <div className="flex flex-col gap-3 px-6 pb-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <AdReportBody data={data} />
      )}
    </ShopSection>
  );
}

function AdReportBody({ data }: Readonly<{ data: ShopAdReport }>) {
  const { t } = useTranslation();
  const money = (n: number | null) => (n === null ? "—" : formatMoney(n, data.currency));
  const sum = (pick: (ad: ShopAdReport["ads"][number]) => number) =>
    data.ads.reduce((total, ad) => total + pick(ad), 0);

  return (
    <div className="flex flex-col gap-4 pb-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 sm:grid-cols-4">
        <Stat label={t("Clicks")} value={sum((ad) => ad.clicks).toLocaleString()} />
        <Stat label={t("Orders")} value={sum((ad) => ad.orders).toLocaleString()} />
        <Stat label={t("Revenue from ads")} value={money(sum((ad) => ad.revenue))} />
        <Stat
          label={t("Messaging cost")}
          value={money(data.ads.some((ad) => ad.cost === null) ? null : sum((ad) => ad.cost ?? 0))}
        />
      </dl>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">{t("Ad")}</TableHead>
            <TableHead className="text-right">{t("Clicks")}</TableHead>
            <TableHead className="text-right">{t("People")}</TableHead>
            <TableHead className="text-right">{t("Cost")}</TableHead>
            <TableHead className="text-right">{t("Orders")}</TableHead>
            <TableHead className="text-right">{t("Revenue")}</TableHead>
            <TableHead className="pr-6 text-right">{t("Return")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.ads.map((ad) => (
            <TableRow key={ad.adId}>
              <TableCell className="max-w-72 pl-6">
                <div className="flex items-center gap-3">
                  {ad.mediaUrl && (
                    <img
                      src={ad.mediaUrl}
                      alt=""
                      className="size-9 shrink-0 rounded-md border border-border object-cover"
                    />
                  )}
                  <div className="flex min-w-0 flex-col">
                    {safeHref(ad.sourceUrl) ? (
                      <a
                        href={safeHref(ad.sourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium underline-offset-4 hover:underline"
                      >
                        {ad.headline || t("Untitled ad")}
                      </a>
                    ) : (
                      <span className="truncate font-medium">
                        {ad.headline || t("Untitled ad")}
                      </span>
                    )}
                    <span className="truncate text-xs text-muted-foreground">
                      {t("Ad {id}", { id: ad.adId })}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {ad.clicks.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {ad.people.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(ad.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">{ad.orders}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {money(ad.revenue)}
              </TableCell>
              <TableCell className="pr-6 text-right tabular-nums">{roiText(ad.roi)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
