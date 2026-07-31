// Extracted verbatim from `billing.tsx`. Behaviour is unchanged.

import { ClipboardX, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import { OrderStatusBadge } from "./shared.tsx";
import type { PaymentOrder } from "./shared.tsx";

export function OrderHistory({
  orders,
  refresh,
  isRefetching,
}: {
  orders: PaymentOrder[] | undefined;
  refresh: () => void;
  isRefetching: boolean;
}) {
  const { t: translations } = useTranslation();
  // Write-only: kept so the details button records the row it opened.
  const [, setSelectedOrder] = useState<PaymentOrder[] | PaymentOrder>([]);
  const [, setOpened] = useState(false);
  return (
    <>
      <Card id="order-history" className="p-6 ">
        <div className="flex items-center justify-between">
          <h3>{translations("Billing History")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefetching}
            className="flex items-center gap-2"
          >
            <RefreshCcw
              className={`w-4 h-4 transition-transform ${isRefetching ? "animate-spin" : ""}`}
            />
            {translations("Refresh")}
          </Button>
        </div>
        {orders?.length === 0 ? (
          <div className="flex items-center justify-center gap-1 p-8">
            <ClipboardX />
            {translations("No Orders Found")}
          </div>
        ) : (
          <div className="space-y-3">
            {orders
              ?.sort(
                (a, b) =>
                  new Date(b.createdAt ?? "").getTime() - new Date(a.createdAt ?? "").getTime(),
              )
              .map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm"> {formatIsoDateString(item?.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{item?.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      {item?.currency === "INR" ? "₹" : "$"}
                      {item?.amount}/-
                    </span>
                    <OrderStatusBadge order={item} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(item);
                        setOpened(true);
                      }}
                    >
                      {translations("Details")}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </>
  );
}
