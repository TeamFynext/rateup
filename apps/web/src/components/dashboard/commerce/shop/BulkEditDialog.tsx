import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { Checkbox } from "@rateup/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  bulkEditShopProducts,
  formatMoney,
  type ShopBulkEdit,
  type ShopProduct,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { getApiErrorMessage } from "@/utils/apiError.ts";

type PriceMode = "keep" | "set" | "percent" | "amount";
type CompareMode = "keep" | "set" | "clear";
type StockMode = "keep" | "set" | "adjust";
type StatusMode = "keep" | "ACTIVE" | "DRAFT";

interface Result {
  updated: number;
  skipped: { variant: string; reason: string }[];
}

const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

/** Prices, stock and status for the variants of the products selected on the list. */
export function BulkEditDialog({
  open,
  onOpenChange,
  products,
  currency,
  onDone,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ShopProduct[];
  currency: string;
  onDone: () => void;
}>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const editable = products.filter((p) => !p.externalSource);
  const mirrored = products.length - editable.length;
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState<{ mode: PriceMode; value: string }>({
    mode: "keep",
    value: "",
  });
  const [compare, setCompare] = useState<{ mode: CompareMode; value: string }>({
    mode: "keep",
    value: "",
  });
  const [stock, setStock] = useState<{ mode: StockMode; value: string }>({
    mode: "keep",
    value: "",
  });
  const [status, setStatus] = useState<StatusMode>("keep");
  const [result, setResult] = useState<Result | null>(null);

  const variantIds = editable
    .flatMap((p) => p.variants.map((v) => v.id))
    .filter((id) => !excluded.has(id));
  const priceValue = toNumber(price.value);
  const compareValue = toNumber(compare.value);
  const stockValue = toNumber(stock.value);
  const invalid =
    (price.mode !== "keep" &&
      (!Number.isFinite(priceValue) || (price.mode === "set" && priceValue < 0))) ||
    (compare.mode === "set" && !(compareValue >= 0)) ||
    (stock.mode !== "keep" &&
      (!Number.isInteger(stockValue) || (stock.mode === "set" && stockValue < 0)));
  const nothing =
    price.mode === "keep" && compare.mode === "keep" && stock.mode === "keep" && status === "keep";

  const apply = useMutation({
    mutationFn: () => {
      const body: ShopBulkEdit = { variantIds };
      if (price.mode !== "keep") body.price = { mode: price.mode, value: priceValue };
      if (compare.mode === "set") body.compareAtPrice = { mode: "set", value: compareValue };
      if (compare.mode === "clear") body.compareAtPrice = { mode: "clear" };
      if (stock.mode !== "keep") body.stock = { mode: stock.mode, value: stockValue };
      if (status !== "keep") body.status = status;
      return bulkEditShopProducts(body);
    },
    onSuccess: (r) => {
      setResult(r);
      void invalidate();
    },
  });

  const close = (next: boolean) => {
    if (!next) {
      if (result) onDone();
      setResult(null);
      setExcluded(new Set());
      setPrice({ mode: "keep", value: "" });
      setCompare({ mode: "keep", value: "" });
      setStock({ mode: "keep", value: "" });
      setStatus("keep");
      apply.reset();
    }
    onOpenChange(next);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Changes saved")}</DialogTitle>
            <DialogDescription>
              {t("{count, plural, one {# variant updated} other {# variants updated}}", {
                count: result.updated,
              })}
            </DialogDescription>
          </DialogHeader>
          {result.skipped.length > 0 && (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto overscroll-contain">
              <span className="text-sm font-semibold">
                {t("{count, plural, one {# left unchanged} other {# left unchanged}}", {
                  count: result.skipped.length,
                })}
              </span>
              <ul className="flex flex-col gap-1 text-sm">
                {result.skipped.map((s, i) => (
                  <li key={`${s.variant}-${i}`} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{s.variant}</span> · {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => close(false)}>{t("Done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("Edit prices and stock")}</DialogTitle>
          <DialogDescription>
            {t("Changes apply to every ticked variant. Anything you leave on Keep stays as it is.")}
          </DialogDescription>
        </DialogHeader>

        {mirrored > 0 && (
          <Alert>
            <AlertDescription>
              {t(
                "{count, plural, one {# product follows your online store, so its prices and stock are edited there.} other {# products follow your online store, so their prices and stock are edited there.}}",
                { count: mirrored },
              )}
            </AlertDescription>
          </Alert>
        )}

        {editable.length > 0 && (
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto overscroll-contain rounded-lg border border-border p-2">
            {editable.flatMap((p) =>
              p.variants.map((v) => (
                <li key={v.id}>
                  <label className="flex items-center gap-2 rounded-md px-1 py-1 text-sm">
                    <Checkbox
                      checked={!excluded.has(v.id)}
                      onCheckedChange={(checked) =>
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {p.title}
                      {p.variants.length > 1 && (
                        <span className="text-muted-foreground"> · {v.title}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatMoney(v.price, currency)}
                      {v.trackInventory && ` · ${t("{count} in stock", { count: v.stock })}`}
                    </span>
                  </label>
                </li>
              )),
            )}
          </ul>
        )}

        <div className="flex flex-col gap-4">
          <BulkRow
            label={t("Price")}
            mode={price.mode}
            onMode={(mode) => setPrice((p) => ({ ...p, mode: mode }))}
            options={[
              { value: "keep", label: t("Keep") },
              { value: "set", label: t("Set to") },
              { value: "percent", label: t("Change by %") },
              { value: "amount", label: t("Change by amount") },
            ]}
            value={price.value}
            onValue={(value) => setPrice((p) => ({ ...p, value }))}
            hint={
              price.mode === "percent" || price.mode === "amount"
                ? t("Use a minus sign to lower prices, for example -10.")
                : undefined
            }
          />
          <BulkRow
            label={t("Original price (shown crossed out)")}
            mode={compare.mode}
            onMode={(mode) => setCompare((c) => ({ ...c, mode: mode }))}
            options={[
              { value: "keep", label: t("Keep") },
              { value: "set", label: t("Set to") },
              { value: "clear", label: t("Remove") },
            ]}
            value={compare.value}
            onValue={(value) => setCompare((c) => ({ ...c, value }))}
            showInput={compare.mode === "set"}
          />
          <BulkRow
            label={t("Stock")}
            mode={stock.mode}
            onMode={(mode) => setStock((s) => ({ ...s, mode: mode }))}
            options={[
              { value: "keep", label: t("Keep") },
              { value: "set", label: t("Set to") },
              { value: "adjust", label: t("Add or remove") },
            ]}
            value={stock.value}
            onValue={(value) => setStock((s) => ({ ...s, value }))}
            numeric
            hint={
              stock.mode === "set"
                ? t("Variants whose stock isn't counted start counting from this number.")
                : stock.mode === "adjust"
                  ? t("Use a minus sign to remove stock. Variants that aren't counted are skipped.")
                  : undefined
            }
          />
          <BulkRow
            label={t("Status")}
            mode={status}
            onMode={(mode) => setStatus(mode)}
            options={[
              { value: "keep", label: t("Keep") },
              { value: "ACTIVE", label: t("Active") },
              { value: "DRAFT", label: t("Draft") },
            ]}
            showInput={false}
          />
        </div>

        {apply.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getApiErrorMessage(apply.error, t("Could not update the products"))}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {t("Cancel")}
          </Button>
          <Button
            disabled={nothing || invalid || variantIds.length === 0}
            loading={apply.isPending}
            onClick={() => apply.mutate()}
          >
            {t("{count, plural, one {Update # variant} other {Update # variants}}", {
              count: variantIds.length,
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkRow<M extends string>({
  label,
  mode,
  onMode,
  options,
  value = "",
  onValue,
  showInput = mode !== "keep",
  numeric,
  hint,
}: Readonly<{
  label: string;
  mode: M;
  onMode: (mode: M) => void;
  options: { value: M; label: string }[];
  value?: string;
  onValue?: (value: string) => void;
  showInput?: boolean;
  numeric?: boolean;
  hint?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={mode}
          onValueChange={(next) => {
            const picked = options.find((o) => o.value === next);
            if (picked) onMode(picked.value);
          }}
          items={options}
        >
          <SelectTrigger className="w-44" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showInput && onValue && (
          <Input
            className="w-32"
            inputMode={numeric ? "numeric" : "decimal"}
            value={value}
            aria-label={label}
            onChange={(e) => onValue(e.target.value)}
          />
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
