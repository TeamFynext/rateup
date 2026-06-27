import { Package, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Separator } from "@/components/ui/separator.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { formatDate } from "@/utils/dateTime.ts";

type OrderProductItem = {
  currency: string;
  quantity: number;
  item_price: number;
  product_retailer_id: string;
};

type OrderContent = {
  text?: string;
  catalog_id: string;
  product_items: OrderProductItem[];
};

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
        <div className="flex items-center gap-3 rounded-lg bg-[#025144] p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#0a6e5c]">
            <ShoppingCart className="h-6 w-6 text-white/80" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-white">
              <ShoppingCart className="mr-1 inline h-3.5 w-3.5" />
              {totalQty} {totalQty === 1 ? translations("item") : translations("items")}
            </span>
            <span className="text-xs text-white/70">
              {formatPrice(total, currency)} ({translations("estimated total")})
            </span>
          </div>
        </div>
        <button
          type="button"
          className="w-full border-t border-white/10 py-2 text-center text-sm font-medium text-[#53bdeb] hover:text-[#7dd3f0] transition-colors"
          onClick={() => setOpen(true)}
        >
          {translations("View sent cart")}
        </button>
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
