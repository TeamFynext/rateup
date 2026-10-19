import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { useShopProduct, useShopStore } from "@/backend/commerce/shop.query";
import { ProductPicker } from "@/components/dashboard/commerce/inbox/ProductPicker.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

export interface ShopProductsActionValue {
  productIds: string[];
  message?: string;
  dropLimit?: number | null;
}

export const MAX_ACTION_PRODUCTS = 10;

export function asShopProductsValue(value: unknown): ShopProductsActionValue {
  if (value && typeof value === "object" && "productIds" in value) {
    const v = value as Partial<ShopProductsActionValue>;
    return {
      productIds: Array.isArray(v.productIds) ? v.productIds : [],
      message: v.message,
      dropLimit: v.dropLimit ?? null,
    };
  }
  return { productIds: [] };
}

/**
 * The products a rule sends. On Instagram the reply to a comment is one private message, so
 * it carries a checkout link when there's one product to buy and the storefront otherwise;
 * on WhatsApp they go as catalog cards the customer can add to a cart from.
 */
export function ShopProductsActionInput({
  value,
  onChange,
  onInstagram,
}: Readonly<{
  value: unknown;
  onChange: (value: ShopProductsActionValue) => void;
  /** Only Instagram replies carry a link or sell a limited drop. */
  onInstagram: boolean;
}>) {
  const current = asShopProductsValue(value);
  const [picking, setPicking] = useState(false);
  const { data: store } = useShopStore();
  const update = (patch: Partial<ShopProductsActionValue>) => onChange({ ...current, ...patch });
  const drop = current.dropLimit != null;

  return (
    <div className="flex w-full flex-col gap-4">
      <Field>
        <FieldLabel>Products</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {current.productIds.map((id) => (
            <ProductChip
              key={id}
              id={id}
              onRemove={() => update({ productIds: current.productIds.filter((p) => p !== id) })}
            />
          ))}
          {current.productIds.length < MAX_ACTION_PRODUCTS && (
            <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
              <IconPlus data-icon="inline-start" />
              {current.productIds.length ? "Add products" : "Choose products"}
            </Button>
          )}
        </div>
        <FieldDescription>
          {onInstagram
            ? "One product with one option gets a direct checkout link. More than that links to your storefront."
            : "Sent as catalog cards the customer can add to a cart from. Products must be live in your WhatsApp catalog."}
        </FieldDescription>
      </Field>

      {onInstagram && store && !store.storefrontEnabled && current.productIds.length > 1 && (
        <Alert>
          <AlertDescription>
            Turn on your storefront in Commerce → Settings, or the reply can only list these
            products without a link.
          </AlertDescription>
        </Alert>
      )}

      <Field>
        <FieldLabel htmlFor="shop-products-message">Message (optional)</FieldLabel>
        <Textarea
          id="shop-products-message"
          rows={2}
          maxLength={600}
          placeholder={onInstagram ? "Thanks for your comment! Here it is:" : "A few picks for you"}
          value={current.message ?? ""}
          onChange={(e) => update({ message: e.target.value || undefined })}
          className="bg-background"
        />
      </Field>

      {onInstagram && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <label className="flex items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">Limited drop</span>
              <span className="text-sm text-muted-foreground">
                Sell only so many, one per person, first come. Later commenters hear it sold out.
              </span>
            </span>
            <Switch
              checked={drop}
              onCheckedChange={(on) => update({ dropLimit: on ? 20 : null })}
            />
          </label>
          {drop && (
            <Field orientation="horizontal" className="items-center">
              <FieldLabel htmlFor="shop-products-drop" className="shrink-0">
                Units available
              </FieldLabel>
              <Input
                id="shop-products-drop"
                type="number"
                min={1}
                inputMode="numeric"
                className="w-28 bg-background"
                value={current.dropLimit ?? ""}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  update({ dropLimit: Number.isNaN(n) ? 1 : Math.max(1, n) });
                }}
              />
            </Field>
          )}
        </div>
      )}

      <PickProductsDialog
        open={picking}
        selected={current.productIds}
        onOpenChange={setPicking}
        onDone={(productIds) => {
          update({ productIds });
          setPicking(false);
        }}
      />
    </div>
  );
}

function ProductChip({ id, onRemove }: Readonly<{ id: string; onRemove: () => void }>) {
  const { data, isPending, isError } = useShopProduct(id);
  if (isPending) return <Skeleton className="h-8 w-28 rounded-full" />;
  const title = isError ? "Removed product" : (data?.title ?? id);
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background pr-1 pl-3 text-sm">
      <span className="max-w-48 truncate">{title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${title}`}
        onClick={onRemove}
      >
        <IconX />
      </Button>
    </span>
  );
}

function PickProductsDialog({
  open,
  selected,
  onOpenChange,
  onDone,
}: Readonly<{
  open: boolean;
  selected: readonly string[];
  onOpenChange: (open: boolean) => void;
  onDone: (productIds: string[]) => void;
}>) {
  const [picked, setPicked] = useState<string[]>([...selected]);
  const full = picked.length >= MAX_ACTION_PRODUCTS;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setPicked([...selected]);
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose products</DialogTitle>
          <DialogDescription>Up to {MAX_ACTION_PRODUCTS} products per reply.</DialogDescription>
        </DialogHeader>
        <ProductPicker
          mode="products"
          selected={new Set(picked)}
          onToggle={(product) =>
            setPicked((ids) =>
              ids.includes(product.id)
                ? ids.filter((id) => id !== product.id)
                : full
                  ? ids
                  : [...ids, product.id],
            )
          }
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onDone(picked)}>
            {picked.length === 1 ? "Use 1 product" : `Use ${picked.length} products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
