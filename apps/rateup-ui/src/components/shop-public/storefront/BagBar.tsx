import { IconBrandWhatsapp, IconChevronUp, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";

import { type ResolvedBagLine, variantLabel, whatsappOrderLink } from "../catalog.ts";
import { QuantityStepper } from "../shared.tsx";

interface Props {
  storeName: string;
  currency: string;
  whatsappNumber: string | null;
  lines: ResolvedBagLine[];
  count: number;
  total: number;
  onQuantity: (variantId: string, quantity: number) => void;
  onCheckout: () => void;
  checkingOut: boolean;
  checkoutError: string | null;
}

export function BagBar(props: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { lines, count, total, currency, whatsappNumber } = props;
  if (!count) return null;

  const totalText = formatMoney(total, currency);
  const waLink = whatsappNumber
    ? whatsappOrderLink(
        whatsappNumber,
        t("Hi {store}, I'd like to order:", { store: props.storeName }),
        lines,
        t("Total: {total}", { total: totalText }),
      )
    : null;

  const actions = (
    <div className={waLink ? "grid grid-cols-2 gap-2" : "grid"}>
      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-wa-green px-3 text-sm font-bold text-ru-blue-950 transition-opacity hover:opacity-90"
        >
          <IconBrandWhatsapp className="size-4" />
          {t("Order on WhatsApp")}
        </a>
      )}
      <Button
        type="button"
        className="h-11 rounded-xl font-bold"
        loading={props.checkingOut}
        onClick={props.onCheckout}
      >
        {t("Checkout")}
      </Button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-xl flex-col gap-2.5 rounded-2xl border border-border bg-background p-3 shadow-[0_12px_32px_rgb(15_37_64/0.18)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-between gap-2 rounded-md text-left font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="inline-flex items-center gap-1">
            {t("{count, plural, one {# item in your bag} other {# items in your bag}}", { count })}
            <IconChevronUp className="size-4 text-muted-foreground" />
          </span>
          <span className="tabular-nums">{totalText}</span>
        </button>
        {props.checkoutError && (
          <p className="text-sm text-destructive" role="alert">
            {props.checkoutError}
          </p>
        )}
        {actions}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-lg font-bold">{t("Your bag")}</SheetTitle>
            <SheetDescription>
              {t("{count, plural, one {# item} other {# items}}", { count })}
            </SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col divide-y divide-border overflow-y-auto px-4">
            {lines.map((line) => {
              const label = variantLabel(line.variant);
              const image = line.variant.imageUrl ?? line.product.images[0];
              return (
                <li key={line.variantId} className="flex items-center gap-3 py-3">
                  {image ? (
                    <img src={image} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="size-12 shrink-0 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{line.product.title}</p>
                    {label && <p className="truncate text-xs text-muted-foreground">{label}</p>}
                    <p className="text-sm tabular-nums">{formatMoney(line.lineTotal, currency)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <QuantityStepper
                      size="sm"
                      min={1}
                      value={line.quantity}
                      label={line.product.title}
                      onChange={(quantity) => props.onQuantity(line.variantId, quantity)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Remove {product}", { product: line.product.title })}
                      onClick={() => props.onQuantity(line.variantId, 0)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <SheetFooter className="border-t border-border">
            <div className="flex justify-between font-bold">
              <span>{t("Subtotal")}</span>
              <span className="tabular-nums">{totalText}</span>
            </div>
            {actions}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
