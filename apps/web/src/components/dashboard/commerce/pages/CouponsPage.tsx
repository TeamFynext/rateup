import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rateup/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import { Label } from "@rateup/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rateup/ui/components/sheet";
import { Skeleton } from "@rateup/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rateup/ui/components/table";
import { IconPlus, IconTicket, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import {
  createShopDiscount,
  deleteShopDiscount,
  formatMoney,
  generateShopDiscountCode,
  toMoney,
  updateShopDiscount,
  type ShopDiscount,
  type ShopDiscountInput,
} from "@/backend/commerce/shop.api";
import {
  useInvalidateShop,
  useShopCollections,
  useShopDiscounts,
  useShopProducts,
  useShopStore,
} from "@/backend/commerce/shop.query";
import { pressable } from "@/components/common/pressable.ts";
import { Card } from "@/components/ui/card.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { StoreCheckoutBanner } from "../settings/StoreCheckoutNotice.tsx";
import { describeDiscount, discountSourceLabel, discountStateBadge } from "../shop/shopMeta.ts";
import { ShopPage, ToneBadge } from "../shop/ShopUi.tsx";

const TYPES = ["PERCENTAGE", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"] as const;
const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), "Enter a number");
const optionalWhole = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[1-9]\d*$/.test(v), "Enter a whole number");

const couponSchema = z
  .object({
    code: z.string().trim().min(3, "At least 3 characters").max(32),
    type: z.enum(TYPES),
    value: optionalNumber,
    buyQty: optionalWhole,
    getQty: optionalWhole,
    minSubtotal: optionalNumber,
    appliesTo: z.enum(["ALL", "COLLECTIONS", "PRODUCTS"]),
    collectionIds: z.array(z.string()),
    productIds: z.array(z.string()),
    eligibility: z.enum(["ANYONE", "FIRST_ORDER", "LOYALTY_MEMBERS"]),
    perCustomerLimit: optionalWhole,
    usageLimit: optionalWhole,
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "PERCENTAGE" || v.type === "FIXED") && v.value === "") {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the discount" });
    }
    if (v.type === "PERCENTAGE" && Number(v.value) > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "100% at most" });
    }
    if (v.type === "BUY_X_GET_Y" && (v.buyQty === "" || v.getQty === "")) {
      ctx.addIssue({ code: "custom", path: ["buyQty"], message: "Enter both quantities" });
    }
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Ends before it starts" });
    }
  });
type CouponValues = z.infer<typeof couponSchema>;

const BLANK: CouponValues = {
  code: "",
  type: "PERCENTAGE",
  value: "",
  buyQty: "",
  getQty: "",
  minSubtotal: "",
  appliesTo: "ALL",
  collectionIds: [],
  productIds: [],
  eligibility: "ANYONE",
  perCustomerLimit: "1",
  usageLimit: "",
  startsAt: undefined,
  endsAt: undefined,
  active: true,
};

const text = (v: number | string | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

function fromDiscount(d: ShopDiscount): CouponValues {
  return {
    code: d.code,
    type: d.type,
    value: d.value === null ? "" : String(toMoney(d.value)),
    buyQty: text(d.buyQty),
    getQty: text(d.getQty),
    minSubtotal: d.minSubtotal === null ? "" : String(toMoney(d.minSubtotal)),
    appliesTo: d.appliesTo,
    collectionIds: d.collectionIds,
    productIds: d.productIds,
    eligibility: d.eligibility,
    perCustomerLimit: text(d.perCustomerLimit),
    usageLimit: text(d.usageLimit),
    startsAt: new Date(d.startsAt),
    endsAt: d.endsAt ? new Date(d.endsAt) : undefined,
    active: d.active,
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));

function toPayload(v: CouponValues): ShopDiscountInput {
  return {
    code: v.code.trim().toUpperCase(),
    type: v.type,
    value: v.type === "PERCENTAGE" || v.type === "FIXED" ? num(v.value) : null,
    buyQty: v.type === "BUY_X_GET_Y" ? num(v.buyQty) : null,
    getQty: v.type === "BUY_X_GET_Y" ? num(v.getQty) : null,
    minSubtotal: num(v.minSubtotal),
    appliesTo: v.appliesTo,
    collectionIds: v.appliesTo === "COLLECTIONS" ? v.collectionIds : [],
    productIds: v.appliesTo === "PRODUCTS" ? v.productIds : [],
    eligibility: v.eligibility,
    perCustomerLimit: num(v.perCustomerLimit),
    usageLimit: num(v.usageLimit),
    startsAt: v.startsAt?.toISOString(),
    endsAt: v.endsAt ? dayjs(v.endsAt).endOf("day").toISOString() : null,
    active: v.active,
  };
}

export function CouponsPage() {
  const { t } = useTranslation();
  const canEdit = useCan("commerce.discounts.manage");
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const { data: store } = useShopStore();
  const currency = store?.currency ?? "USD";
  const { data: discounts, isPending, isError, error } = useShopDiscounts();
  const [editing, setEditing] = useState<ShopDiscount | "new" | null>(null);

  const remove = useMutation({
    mutationFn: deleteShopDiscount,
    onSuccess: ({ archived }) => {
      toast.success(
        archived
          ? t("This code has been used, so it was switched off and kept for your records.")
          : t("Coupon deleted"),
      );
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not delete the coupon"))),
  });

  const onDelete = async (d: ShopDiscount) => {
    const ok = await confirm({
      title: t("Delete {code}?", { code: d.code }),
      description: t(
        "Customers can no longer use this code. A code that has been used is switched off instead.",
      ),
      confirmText: t("Delete"),
    });
    if (ok) remove.mutate(d.id);
  };

  return (
    <ShopPage
      title={t("Coupons")}
      description={t(
        "Codes customers can use in chat checkout and on your storefront. Loyalty rewards and cart-reminder codes show up here too.",
      )}
      actions={
        canEdit ? (
          <Button onClick={() => setEditing("new")}>
            <IconPlus data-icon="inline-start" />
            {t("New coupon")}
          </Button>
        ) : undefined
      }
    >
      {store && (
        <div className="mb-4">
          <StoreCheckoutBanner store={store} area="coupons" />
        </div>
      )}
      <Card className="gap-0 py-0">
        {isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("Could not load coupons")}</EmptyTitle>
              <EmptyDescription>
                {getApiErrorMessage(error, t("Please try again."))}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : discounts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconTicket />
              </EmptyMedia>
              <EmptyTitle>{t("No coupons yet")}</EmptyTitle>
              <EmptyDescription>
                {t("Create a code to share in a broadcast, a cart reminder or an Instagram reply.")}
              </EmptyDescription>
            </EmptyHeader>
            {canEdit && (
              <EmptyContent>
                <Button onClick={() => setEditing("new")}>{t("New coupon")}</Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("Code")}</TableHead>
                <TableHead>{t("Discount")}</TableHead>
                <TableHead>{t("Used")}</TableHead>
                <TableHead>{t("Revenue")}</TableHead>
                <TableHead>{t("Ends")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">{t("Actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((d) => {
                const state = discountStateBadge(t, d.state);
                return (
                  <TableRow
                    key={d.id}
                    className={canEdit ? "cursor-pointer" : undefined}
                    {...(canEdit
                      ? pressable(() => setEditing(d), t("Edit {code}", { code: d.code }))
                      : {})}
                  >
                    <TableCell className="pl-4">
                      <span className="rounded-md border border-dashed border-border bg-muted px-2 py-0.5 font-mono text-[13px] font-semibold">
                        {d.code}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {discountSourceLabel(t, d.source)}
                      </div>
                    </TableCell>
                    <TableCell>{describeDiscount(t, d, currency)}</TableCell>
                    <TableCell className="tabular-nums">
                      {d.usageLimit ? `${d.usedCount} / ${d.usageLimit}` : d.usedCount}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {formatMoney(d.revenue, currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.endsAt ? dayjs(d.endsAt).format("MMM D, YYYY") : t("No end date")}
                    </TableCell>
                    <TableCell>
                      <ToneBadge tone={state.tone}>{state.label}</ToneBadge>
                    </TableCell>
                    <TableCell className="pr-4">
                      {canEdit && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("Delete {code}", { code: d.code })}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(d);
                          }}
                        >
                          <IconTrash />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {editing !== null && (
            <CouponForm
              key={editing === "new" ? "new" : editing.id}
              discount={editing === "new" ? undefined : editing}
              currency={currency}
              onDone={() => setEditing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </ShopPage>
  );
}

function CouponForm({
  discount,
  currency,
  onDone,
}: Readonly<{ discount?: ShopDiscount; currency: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const { data: collections = [] } = useShopCollections();
  const { data: products } = useShopProducts({ status: "ACTIVE", limit: 100 });
  const form = useForm<CouponValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: discount ? fromDiscount(discount) : BLANK,
  });
  const [type, appliesTo] = useWatch({ control: form.control, name: ["type", "appliesTo"] });
  const { errors } = form.formState;

  const save = useMutation({
    mutationFn: (values: CouponValues) =>
      discount
        ? updateShopDiscount(discount.id, toPayload(values))
        : createShopDiscount(toPayload(values)),
    onSuccess: () => {
      toast.success(discount ? t("Coupon saved") : t("Coupon created"));
      void invalidate();
      onDone();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the coupon"))),
  });
  const generate = useMutation({
    mutationFn: () => generateShopDiscountCode(),
    onSuccess: ({ code }) =>
      form.setValue("code", code, { shouldDirty: true, shouldValidate: true }),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not generate a code"))),
  });

  const typeLabels: Record<(typeof TYPES)[number], string> = {
    PERCENTAGE: t("% off"),
    FIXED: t("Fixed amount"),
    FREE_SHIPPING: t("Free shipping"),
    BUY_X_GET_Y: t("Buy X get Y"),
  };
  const anyDate = () => false;

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      noValidate
    >
      <SheetHeader>
        <SheetTitle>{discount ? t("Edit coupon") : t("New coupon")}</SheetTitle>
        <SheetDescription>
          {t("Customers type the code at checkout, in chat or on your storefront.")}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
        <Field data-invalid={Boolean(errors.code)}>
          <FieldLabel htmlFor="coupon-code">{t("Code")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              className="uppercase"
              maxLength={32}
              {...form.register("code")}
            />
            <Button
              type="button"
              variant="outline"
              loading={generate.isPending}
              onClick={() => generate.mutate()}
            >
              {t("Generate")}
            </Button>
          </div>
          {errors.code && <FieldError errors={[errors.code]} />}
        </Field>

        <Field>
          <FieldLabel>{t("Type")}</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <ToggleGroup
                variant="outline"
                className="flex-wrap"
                value={[field.value]}
                onValueChange={(values) => {
                  const next = TYPES.find((ty) => ty === values[0]);
                  if (next) field.onChange(next);
                }}
              >
                {TYPES.map((ty) => (
                  <ToggleGroupItem key={ty} value={ty}>
                    {typeLabels[ty]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          {type === "PERCENTAGE" && (
            <Field data-invalid={Boolean(errors.value)}>
              <FieldLabel htmlFor="coupon-value">{t("Percent off")}</FieldLabel>
              <Input id="coupon-value" inputMode="decimal" {...form.register("value")} />
              {errors.value && <FieldError errors={[errors.value]} />}
            </Field>
          )}
          {type === "FIXED" && (
            <Field data-invalid={Boolean(errors.value)}>
              <FieldLabel htmlFor="coupon-value">
                {t("Amount off ({currency})", { currency })}
              </FieldLabel>
              <Input id="coupon-value" inputMode="decimal" {...form.register("value")} />
              {errors.value && <FieldError errors={[errors.value]} />}
            </Field>
          )}
          {type === "BUY_X_GET_Y" && (
            <>
              <Field data-invalid={Boolean(errors.buyQty)}>
                <FieldLabel htmlFor="coupon-buy">{t("Customer buys")}</FieldLabel>
                <Input id="coupon-buy" inputMode="numeric" {...form.register("buyQty")} />
                {errors.buyQty && <FieldError errors={[errors.buyQty]} />}
              </Field>
              <Field>
                <FieldLabel htmlFor="coupon-get">{t("Gets free")}</FieldLabel>
                <Input id="coupon-get" inputMode="numeric" {...form.register("getQty")} />
              </Field>
            </>
          )}
          <Field data-invalid={Boolean(errors.minSubtotal)}>
            <FieldLabel htmlFor="coupon-min">
              {t("Minimum order ({currency})", { currency })}
            </FieldLabel>
            <Input id="coupon-min" inputMode="decimal" {...form.register("minSubtotal")} />
            {errors.minSubtotal && <FieldError errors={[errors.minSubtotal]} />}
          </Field>
        </div>

        <Field>
          <FieldLabel>{t("Applies to")}</FieldLabel>
          <Controller
            control={form.control}
            name="appliesTo"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value === "ALL" || value === "COLLECTIONS" || value === "PRODUCTS")
                    field.onChange(value);
                }}
                items={[
                  { value: "ALL", label: t("Whole order") },
                  { value: "COLLECTIONS", label: t("Some collections") },
                  { value: "PRODUCTS", label: t("Some products") },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("Whole order")}</SelectItem>
                  <SelectItem value="COLLECTIONS">{t("Some collections")}</SelectItem>
                  <SelectItem value="PRODUCTS">{t("Some products")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {appliesTo === "COLLECTIONS" && (
            <Controller
              control={form.control}
              name="collectionIds"
              render={({ field }) => (
                <MultiSelect
                  options={collections.map((c) => ({ value: c.id, label: c.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("Pick collections")}
                />
              )}
            />
          )}
          {appliesTo === "PRODUCTS" && (
            <Controller
              control={form.control}
              name="productIds"
              render={({ field }) => (
                <MultiSelect
                  options={(products?.items ?? []).map((p) => ({ value: p.id, label: p.title }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("Pick products")}
                />
              )}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={Boolean(errors.perCustomerLimit)}>
            <FieldLabel htmlFor="coupon-per">{t("Uses per customer")}</FieldLabel>
            <Input
              id="coupon-per"
              inputMode="numeric"
              placeholder={t("No limit")}
              {...form.register("perCustomerLimit")}
            />
          </Field>
          <Field data-invalid={Boolean(errors.usageLimit)}>
            <FieldLabel htmlFor="coupon-total">{t("Total uses")}</FieldLabel>
            <Input
              id="coupon-total"
              inputMode="numeric"
              placeholder={t("No limit")}
              {...form.register("usageLimit")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="coupon-starts">{t("Starts")}</FieldLabel>
            <Controller
              control={form.control}
              name="startsAt"
              render={({ field }) => (
                <DatePicker
                  id="coupon-starts"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={anyDate}
                  placeholder={t("Now")}
                />
              )}
            />
          </Field>
          <Field data-invalid={Boolean(errors.endsAt)}>
            <FieldLabel htmlFor="coupon-ends">{t("Ends")}</FieldLabel>
            <Controller
              control={form.control}
              name="endsAt"
              render={({ field }) => (
                <DatePicker
                  id="coupon-ends"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={anyDate}
                  placeholder={t("No end date")}
                />
              )}
            />
            {errors.endsAt && <FieldError errors={[errors.endsAt]} />}
          </Field>
        </div>

        <Field>
          <FieldLabel>{t("Who can use it")}</FieldLabel>
          <Controller
            control={form.control}
            name="eligibility"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  if (value === "ANYONE" || value === "FIRST_ORDER" || value === "LOYALTY_MEMBERS")
                    field.onChange(value);
                }}
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="ANYONE" />
                  {t("Anyone with the code")}
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="FIRST_ORDER" />
                  {t("First order only")}
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="LOYALTY_MEMBERS" />
                  {t("Loyalty members")}
                </Label>
              </RadioGroup>
            )}
          />
        </Field>

        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 font-normal">
              <span className="flex flex-col">
                <span className="font-semibold">{t("Active")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("Switch off to pause the code without deleting it.")}
                </span>
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </Label>
          )}
        />

        <div className="rounded-lg bg-muted p-3 text-[13px]">
          <div className="mb-1 font-semibold">{t("After saving")}</div>
          <span className="text-muted-foreground">
            {t(
              "Send it in a WhatsApp broadcast, add it to cart reminders, or attach it to an Instagram comment reply.",
            )}
          </span>
        </div>
      </div>
      <SheetFooter>
        <Button type="submit" className="w-full" loading={save.isPending}>
          {t("Save coupon")}
        </Button>
      </SheetFooter>
    </form>
  );
}
