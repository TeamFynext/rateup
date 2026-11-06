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
import { Switch } from "@rateup/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rateup/ui/components/table";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { countries as countryData } from "country-data-list";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  connectEasypost,
  createShippingRate,
  deleteShippingRate,
  disconnectEasypost,
  formatMoney,
  toMoney,
  updateShippingRate,
  type ShippingProviders,
  type ShopAddress,
  type ShopShippingRate,
  type ShopShippingRateInput,
  type ShopStore,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopShippingProviders } from "@/backend/commerce/shop.query";
import { CountryDropdown } from "@/components/ui/country-dropdown.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { SettingRow, ShopSection, ToneBadge } from "../shop/ShopUi.tsx";
import { numOrNull } from "../shop/useStoreSection.ts";
import { StoreCheckoutBanner } from "./StoreCheckoutNotice.tsx";

const COUNTRY_OPTIONS = countryData.all
  .filter((c) => c.emoji && c.status !== "deleted" && c.alpha2 && c.name)
  .map((c) => ({ value: c.alpha2, label: `${c.emoji} ${c.name}` }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const countryName = (code: string) =>
  COUNTRY_OPTIONS.find((c) => c.value === code)?.label.replace(/^\S+\s/, "") ?? code;

/** A new rate starts as the one most shops need first, so there is only a price to type. */
export const STANDARD_RATE = {
  zone: "Domestic",
  countries: [] as string[],
  name: "Standard",
  minDays: "2",
  maxDays: "5",
  price: "",
  freeOver: "",
  active: true,
};
export type RateDraft = typeof STANDARD_RATE;

/**
 * The shop's own country, read from its WhatsApp number and then the browser's locale. A store
 * has no country of its own, and a "Domestic" rate with no countries would serve everywhere.
 */
export function homeCountry(store: ShopStore): string | undefined {
  const phone = store.whatsapp?.numbers.find((n) => n.phone)?.phone;
  const fromPhone = phone
    ? parsePhoneNumberFromString(`+${phone.replace(/^\+/, "")}`)?.country
    : undefined;
  if (fromPhone) return fromPhone;
  try {
    return new Intl.Locale(navigator.language).maximize().region;
  } catch {
    return undefined;
  }
}

/** The standard rate, limited to the shop's own country when it is known. */
export function standardRate(store: ShopStore): RateDraft {
  const country = homeCountry(store);
  return country && COUNTRY_OPTIONS.some((c) => c.value === country)
    ? { ...STANDARD_RATE, countries: [country] }
    : { ...STANDARD_RATE, zone: "Everywhere" };
}

export const rateDraftValid = (d: RateDraft) =>
  Boolean(d.zone.trim() && d.name.trim() && /^\d+(\.\d+)?$/.test(d.price.trim()));

export const rateInput = (d: RateDraft, position: number): ShopShippingRateInput => ({
  zone: d.zone.trim(),
  countries: d.countries,
  name: d.name.trim(),
  minDays: numOrNull(d.minDays),
  maxDays: numOrNull(d.maxDays),
  price: Number(d.price),
  freeOver: numOrNull(d.freeOver),
  active: d.active,
  position,
});

export function DeliveryTab({ store }: Readonly<{ store: ShopStore }>) {
  const canManage = useCan("commerce.payments.manage");
  return (
    <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-5">
      <StoreCheckoutBanner store={store} area="delivery" />
      <ShippingRatesSection store={store} />
      <EasypostSection />
    </fieldset>
  );
}

function ShippingRatesSection({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const [editing, setEditing] = useState<{ rate?: ShopShippingRate; draft: RateDraft } | null>(
    null,
  );
  const rates = store.shippingRates ?? [];
  const money = (v: ShopShippingRate["price"]) => formatMoney(v, store.currency);

  const remove = useMutation({
    mutationFn: deleteShippingRate,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not delete the rate"))),
  });
  const onDelete = async (rate: ShopShippingRate) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: rate.name }),
      confirmText: t("Delete"),
    });
    if (ok) remove.mutate(rate.id);
  };

  const days = (r: ShopShippingRate) => {
    if (r.minDays === null && r.maxDays === null) return "—";
    if (r.minDays === 0 && (r.maxDays ?? 0) === 0) return t("Same day");
    if (r.minDays !== null && r.maxDays !== null && r.minDays !== r.maxDays)
      return t("{min}–{max} days", { min: r.minDays, max: r.maxDays });
    return t("{count, plural, one {# day} other {# days}}", { count: r.maxDays ?? r.minDays ?? 0 });
  };

  return (
    <ShopSection
      title={t("Shipping rates")}
      description={t("Customers see the rates that match their address.")}
      flush
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing({ draft: standardRate(store) })}
        >
          <IconPlus data-icon="inline-start" />
          {t("Add rate")}
        </Button>
      }
    >
      {rates.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">
          {t("No shipping rates yet. Checkout skips the delivery step until you add one.")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">{t("Zone")}</TableHead>
              <TableHead>{t("Option")}</TableHead>
              <TableHead>{t("Delivery time")}</TableHead>
              <TableHead>{t("Price")}</TableHead>
              <TableHead>{t("Free over")}</TableHead>
              <TableHead className="w-24 pr-6">
                <span className="sr-only">{t("Actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-6 font-semibold">
                  {r.zone}
                  <div className="max-w-56 truncate text-xs font-normal text-muted-foreground">
                    {r.countries.length > 0
                      ? r.countries.map(countryName).join(", ")
                      : t("Everywhere")}
                  </div>
                </TableCell>
                <TableCell>
                  {r.name}
                  {!r.active && (
                    <ToneBadge tone="mute" className="ml-2">
                      {t("Off")}
                    </ToneBadge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{days(r)}</TableCell>
                <TableCell className="tabular-nums">
                  {toMoney(r.price) === 0 ? t("Free") : money(r.price)}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {r.freeOver === null ? "—" : money(r.freeOver)}
                </TableCell>
                <TableCell className="pr-6">
                  <span className="flex justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("Edit {name}", { name: r.name })}
                      onClick={() =>
                        setEditing({
                          rate: r,
                          draft: {
                            zone: r.zone,
                            countries: r.countries,
                            name: r.name,
                            minDays: r.minDays === null ? "" : String(r.minDays),
                            maxDays: r.maxDays === null ? "" : String(r.maxDays),
                            price: String(toMoney(r.price)),
                            freeOver: r.freeOver === null ? "" : String(toMoney(r.freeOver)),
                            active: r.active,
                          },
                        })
                      }
                    >
                      <IconPencil />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("Delete {name}", { name: r.name })}
                      onClick={() => void onDelete(r)}
                    >
                      <IconTrash />
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {editing && (
        <RateDialog
          rate={editing.rate}
          initial={editing.draft}
          position={editing.rate?.position ?? rates.length}
          currency={store.currency}
          onClose={() => setEditing(null)}
        />
      )}
    </ShopSection>
  );
}

/** The rate's fields, shared by the dialog here and the setup page's inline form. */
export function RateFields({
  draft: d,
  set,
  currency,
  idPrefix = "rate",
}: Readonly<{
  draft: RateDraft;
  set: (patch: Partial<RateDraft>) => void;
  currency: string;
  idPrefix?: string;
}>) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>{t("Option name")}</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          maxLength={40}
          value={d.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-zone`}>{t("Zone")}</FieldLabel>
        <Input
          id={`${idPrefix}-zone`}
          maxLength={40}
          value={d.zone}
          onChange={(e) => set({ zone: e.target.value })}
        />
      </Field>
      <Field className="col-span-2">
        <FieldLabel htmlFor={`${idPrefix}-countries`}>{t("Countries")}</FieldLabel>
        <MultiSelect
          id={`${idPrefix}-countries`}
          options={COUNTRY_OPTIONS}
          value={d.countries}
          onValueChange={(countries) => set({ countries })}
          placeholder={d.countries.length ? undefined : t("Everywhere")}
          emptyIndicator={t("No country matches")}
        />
        <span className="text-xs text-muted-foreground">
          {t("Leave empty to offer this rate everywhere.")}
        </span>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-price`}>
          {t("Price ({currency})", { currency })}
        </FieldLabel>
        <Input
          id={`${idPrefix}-price`}
          inputMode="decimal"
          placeholder="0"
          value={d.price}
          onChange={(e) => set({ price: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-free`}>
          {t("Free over ({currency})", { currency })}
        </FieldLabel>
        <Input
          id={`${idPrefix}-free`}
          inputMode="decimal"
          value={d.freeOver}
          onChange={(e) => set({ freeOver: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-min`}>{t("Fastest (days)")}</FieldLabel>
        <Input
          id={`${idPrefix}-min`}
          inputMode="numeric"
          value={d.minDays}
          onChange={(e) => set({ minDays: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-max`}>{t("Slowest (days)")}</FieldLabel>
        <Input
          id={`${idPrefix}-max`}
          inputMode="numeric"
          value={d.maxDays}
          onChange={(e) => set({ maxDays: e.target.value })}
        />
      </Field>
    </div>
  );
}

function RateDialog({
  rate,
  initial,
  position,
  currency,
  onClose,
}: Readonly<{
  rate?: ShopShippingRate;
  initial: RateDraft;
  position: number;
  currency: string;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [d, setD] = useState(initial);
  const set = (patch: Partial<RateDraft>) => setD((prev) => ({ ...prev, ...patch }));
  const save = useMutation({
    mutationFn: () => {
      const body = rateInput(d, position);
      return rate ? updateShippingRate(rate.id, body) : createShippingRate(body);
    },
    onSuccess: () => {
      toast.success(t("Shipping rate saved"));
      void invalidate();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the rate"))),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rate ? t("Edit shipping rate") : t("Add shipping rate")}</DialogTitle>
        </DialogHeader>
        <RateFields draft={d} set={set} currency={currency} />
        <SettingRow
          title={t("Offer this rate")}
          control={
            <Switch
              aria-label={t("Offer this rate")}
              checked={d.active}
              onCheckedChange={(v) => set({ active: v })}
            />
          }
        />
        <DialogFooter>
          <Button
            loading={save.isPending}
            disabled={!rateDraftValid(d)}
            onClick={() => save.mutate()}
          >
            {t("Save rate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BLANK_ADDRESS: Required<ShopAddress> & { company: string } = {
  company: "",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

function EasypostSection() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const { data } = useShopShippingProviders();
  const [open, setOpen] = useState(false);
  const disconnect = useMutation({
    mutationFn: disconnectEasypost,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not disconnect"))),
  });
  const connected = data?.easypost.connected ?? false;
  return (
    <ShopSection
      title={t("Shipping labels")}
      description={t(
        "Connect EasyPost to compare carriers and buy labels from an order. Customers get tracking on WhatsApp automatically.",
      )}
      actions={
        connected ? (
          <span className="flex items-center gap-2">
            <ToneBadge tone="ok">{t("Connected")}</ToneBadge>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              {t("Edit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (
                  await confirm({ title: t("Disconnect EasyPost?"), confirmText: t("Disconnect") })
                )
                  disconnect.mutate();
              }}
            >
              {t("Disconnect")}
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {t("Connect")}
          </Button>
        )
      }
    >
      {connected && data?.easypost.fromAddress && (
        <p className="text-sm text-muted-foreground">
          {t("Ships from {address}", {
            address: [
              data.easypost.fromAddress.company ?? data.easypost.fromAddress.name,
              data.easypost.fromAddress.city,
              data.easypost.fromAddress.country,
            ]
              .filter(Boolean)
              .join(", "),
          })}
        </p>
      )}
      {open && <EasypostDialog current={data} onClose={() => setOpen(false)} />}
    </ShopSection>
  );
}

function EasypostDialog({
  current,
  onClose,
}: Readonly<{ current?: ShippingProviders; onClose: () => void }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [apiKey, setApiKey] = useState("");
  const [address, setAddress] = useState({ ...BLANK_ADDRESS, ...current?.easypost.fromAddress });
  const set = (patch: Partial<typeof address>) => setAddress((a) => ({ ...a, ...patch }));
  const connect = useMutation({
    mutationFn: () =>
      connectEasypost({
        apiKey: apiKey.trim(),
        fromAddress: Object.fromEntries(Object.entries(address).filter(([, v]) => v.trim() !== "")),
      }),
    onSuccess: () => {
      toast.success(t("EasyPost connected"));
      void invalidate();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not connect EasyPost"))),
  });
  const valid =
    apiKey.trim().length >= 10 &&
    address.name.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    /^[A-Za-z]{2}$/.test(address.country.trim());
  const fields: { key: keyof typeof address; label: string; wide?: boolean }[] = [
    { key: "company", label: t("Company") },
    { key: "name", label: t("Contact name") },
    { key: "phone", label: t("Phone") },
    { key: "line1", label: t("Address line 1"), wide: true },
    { key: "line2", label: t("Address line 2"), wide: true },
    { key: "city", label: t("City") },
    { key: "region", label: t("State or region") },
    { key: "postalCode", label: t("Postal code") },
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Connect EasyPost")}</DialogTitle>
          <DialogDescription>
            {t("Paste your EasyPost API key and the address parcels ship from.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pr-1">
          <Field className="col-span-2">
            <FieldLabel htmlFor="ep-key">{t("API key")}</FieldLabel>
            <Input
              id="ep-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
          {fields.map((f) => (
            <Field key={f.key} className={f.wide ? "col-span-2" : undefined}>
              <FieldLabel htmlFor={`ep-${f.key}`}>{f.label}</FieldLabel>
              <Input
                id={`ep-${f.key}`}
                value={address[f.key]}
                onChange={(e) => set({ [f.key]: e.target.value })}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel>{t("Country")}</FieldLabel>
            <CountryDropdown
              defaultValue={address.country.toUpperCase() || undefined}
              placeholder={t("Select a country")}
              onChange={(country) => set({ country: country.alpha2 })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button loading={connect.isPending} disabled={!valid} onClick={() => connect.mutate()}>
            {t("Connect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
