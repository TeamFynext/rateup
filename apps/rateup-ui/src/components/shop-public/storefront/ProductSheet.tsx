import { IconBell, IconBrandWhatsapp, IconShoppingBagPlus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type StorefrontProduct, subscribeBackInStock } from "@/backend/commerce/shop.api";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import {
  findVariant,
  initialSelection,
  isValueAvailable,
  type OptionSelection,
} from "../catalog.ts";
import { PriceTag, QuantityStepper } from "../shared.tsx";

interface Props {
  slug: string;
  currency: string;
  product: StorefrontProduct | null;
  onClose: () => void;
  onAdd: (line: { productId: string; variantId: string; quantity: number }) => void;
}

export function ProductSheet({ product, onClose, ...rest }: Readonly<Props>) {
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-0 sm:max-w-lg">
        {/* Keyed so a second product starts from its own first variant and quantity 1. */}
        {product && (
          <ProductDetail key={product.id} product={product} onClose={onClose} {...rest} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProductDetail({
  product,
  slug,
  currency,
  onClose,
  onAdd,
}: Readonly<Props & { product: StorefrontProduct }>) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<OptionSelection>(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const variant = findVariant(product, selection);
  const images = [variant?.imageUrl, ...product.images].filter(
    (url, index, all): url is string => Boolean(url) && all.indexOf(url) === index,
  );

  return (
    <>
      {images.length > 0 && (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-muted">
          {images.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="aspect-square w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 px-5 pb-5">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-xl font-bold">{product.title}</DialogTitle>
          {variant && (
            <PriceTag
              price={variant.price}
              compareAt={variant.compareAtPrice}
              currency={currency}
              className="text-lg"
            />
          )}
          {product.description && (
            <DialogDescription className="whitespace-pre-line">
              {product.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {(product.options ?? []).map((option) => (
          <fieldset key={option.name} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">
              {option.name}
              {selection[option.name] && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {selection[option.name]}
                </span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const selected = selection[option.name] === value;
                const available = isValueAvailable(product, selection, option.name, value);
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    size="sm"
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full",
                      !available && !selected && "text-muted-foreground line-through",
                    )}
                    onClick={() =>
                      setSelection((current) => ({ ...current, [option.name]: value }))
                    }
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {!variant ? (
          <Alert>
            <AlertDescription>{t("This combination isn't available.")}</AlertDescription>
          </Alert>
        ) : variant.soldOut ? (
          <NotifyMe slug={slug} variantId={variant.id} />
        ) : (
          <div className="flex flex-col gap-3">
            {variant.lowStock && (
              <Badge variant="outline" className="border-ru-amber-300 text-ru-amber-700">
                {t("Only a few left")}
              </Badge>
            )}
            <div className="flex items-center gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} label={product.title} />
              <Button
                type="button"
                size="lg"
                className="h-11 flex-1 rounded-xl"
                onClick={() => {
                  onAdd({ productId: product.id, variantId: variant.id, quantity });
                  onClose();
                }}
              >
                <IconShoppingBagPlus />
                {t("Add to bag")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function NotifyMe({ slug, variantId }: Readonly<{ slug: string; variantId: string }>) {
  const { t } = useTranslation();
  const subscribe = useMutation({ mutationFn: () => subscribeBackInStock(slug, variantId) });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div>
        <p className="font-semibold">{t("Sold out")}</p>
        <p className="text-sm text-muted-foreground">
          {subscribe.isSuccess
            ? t(
                "Send the message that opens in WhatsApp. That signs you up, and we'll tell you there when it's back.",
              )
            : t("Send us a quick WhatsApp message and we'll tell you when it's back.")}
        </p>
      </div>
      {subscribe.isError && (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(subscribe.error, t("Couldn't start that. Try again."))}
        </p>
      )}
      {subscribe.isSuccess ? (
        <Button
          variant="outline"
          render={<a href={subscribe.data.waUrl} target="_blank" rel="noreferrer" />}
        >
          <IconBrandWhatsapp />
          {t("Open WhatsApp")}
        </Button>
      ) : (
        <Button variant="outline" loading={subscribe.isPending} onClick={() => subscribe.mutate()}>
          <IconBell />
          {t("Notify me on WhatsApp")}
        </Button>
      )}
    </div>
  );
}
