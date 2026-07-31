import { Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { formatDate } from "@/utils/dateTime.ts";

interface OrderProductItem {
  currency: string;
  quantity: number;
  item_price: number;
  product_retailer_id: string;
}

export interface OrderContent {
  text?: string;
  catalog_id: string;
  product_items: OrderProductItem[];
}

const formatPrice = (price: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
};

const WaInboxOrder = ({
  messageContent,
  timestamp,
}: {
  messageContent: OrderContent;
  timestamp?: string;
}) => {
  const { t: translations } = useTranslation();
  const [open, setOpen] = useState(false);
  const items = messageContent?.product_items ?? [];
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.item_price * item.quantity, 0);
  const currency = items[0]?.currency ?? "INR";

  return (
    <>
      <div className="flex flex-col min-w-60 max-w-75">
        {/* Cart summary: green is the commerce accent, but the labels track the
            bubble's own foreground so they stay legible on any bubble variant. */}
        <div className="flex items-center gap-3 rounded-lg bg-green-600/10 p-3 dark:bg-green-500/15">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-green-600/20 dark:bg-green-500/25">
            <ShoppingCart className="h-6 w-6 text-green-700 dark:text-green-500" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              <ShoppingCart className="mr-1 inline h-3.5 w-3.5" />
              {totalQty} {totalQty === 1 ? translations("item") : translations("items")}
            </span>
            <span className="text-xs opacity-70">
              {formatPrice(total, currency)} ({translations("estimated total")})
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          // Same treatment as template buttons: inherit the bubble's colour instead
          // of naming one, so the action never disappears into the bubble fill.
          className="w-full justify-center h-9 rounded-none text-current hover:bg-current/15 hover:text-current dark:hover:bg-current/15"
          onClick={() => setOpen(true)}
        >
          {translations("View sent cart")}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader className="border-b">
            <SheetTitle className="text-base font-semibold">
              {translations("Your sent cart")}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm font-semibold mb-4">
              {totalQty} {totalQty === 1 ? translations("item") : translations("items")}
            </p>

            <div className="flex flex-col gap-4">
              {items.map((item) => (
                <div key={item.product_retailer_id} className="flex items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">#{item.product_retailer_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {translations("Quantity")} {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatPrice(item.item_price, item.currency)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{translations("Estimated total")}</span>
              <span className="text-sm font-semibold">{formatPrice(total, currency)}</span>
            </div>

            {timestamp ? (
              <p className="text-xs text-muted-foreground mt-2">{formatDate(timestamp)}</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WaInboxOrder;
