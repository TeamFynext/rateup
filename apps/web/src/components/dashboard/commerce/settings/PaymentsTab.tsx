import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Textarea } from "@rateup/ui/components/textarea";
import { IconCircleCheck, IconClock, IconExternalLink } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  connectShopPaymentProvider,
  disconnectShopPaymentProvider,
  setShopPaymentWebhookSecret,
  toMoney,
  updateShopStore,
  type PaymentProviderId,
  type ShopPaymentProvider,
  type ShopStore,
  type ShopStoreUpdate,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopPayments } from "@/backend/commerce/shop.query";
import { Card } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { SettingsSaveBar } from "../shop/SettingsSaveBar.tsx";
import { settingsTab } from "../shop/shopMeta.ts";
import { SettingRow, ShopSection, ToneBadge } from "../shop/ShopUi.tsx";
import { numOrNull, useStoreSection } from "../shop/useStoreSection.ts";
import { CopyField } from "./parts.tsx";
import { StoreCheckoutBanner } from "./StoreCheckoutNotice.tsx";

dayjs.extend(relativeTime);

const RAZORPAY_EVENTS = ["payment_link.paid", "payment_link.expired", "refund.processed"] as const;

export function PaymentsTab({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const canManage = useCan("commerce.payments.manage");
  const initial = paymentOptionsDraft(store);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <fieldset disabled={!canManage} className="min-w-0">
        <StoreCheckoutBanner store={store} area="payments" />
      </fieldset>
      <ShopSection
        title={t("Online payments")}
        description={t(
          "We send a secure payment link in the chat. Payouts go straight to your own account; RateUp never holds your money.",
        )}
      >
        <GatewayCards store={store} />
      </ShopSection>
      <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-5">
        <PaymentOptionsForm key={JSON.stringify(initial)} initial={initial} canManage={canManage} />
      </fieldset>
    </div>
  );
}

/** Stripe and Razorpay side by side, plus WhatsApp Pay where Meta offers it. */
/** Gates its own controls on payments permission; a failed load can still be retried by anyone. */
export function GatewayCards({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const canManage = useCan("commerce.payments.manage");
  const { data: payments, isError, error, refetch, isRefetching } = useShopPayments();
  const [connecting, setConnecting] = useState<PaymentProviderId | null>(null);

  if (isError && !payments)
    return (
      <Empty className="rounded-xl border border-dashed">
        <EmptyHeader>
          <EmptyTitle>{t("Payment providers could not be loaded")}</EmptyTitle>
          <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" loading={isRefetching} onClick={() => void refetch()}>
            {t("Try again")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  if (!payments) return <Skeleton className="h-36 w-full rounded-xl" />;
  const wa = payments.whatsappPay;

  return (
    <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {payments.providers.map((p) => (
          <GatewayCard key={p.id} provider={p} onConnect={() => setConnecting(p.id)} />
        ))}
      </div>
      {wa.currencies.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{t("WhatsApp Pay")}</span>
          {wa.available ? (
            <ToneBadge tone="ok">{t("Available")}</ToneBadge>
          ) : (
            <ToneBadge tone="mute">
              {t("Not for {currency}", { currency: store.currency })}
            </ToneBadge>
          )}
          {t("Meta offers it for stores selling in {currencies}.", {
            currencies: wa.currencies.join(", "),
          })}
        </p>
      )}
      {connecting && (
        <ConnectGatewayDialog provider={connecting} onClose={() => setConnecting(null)} />
      )}
    </fieldset>
  );
}

function GatewayCard({
  provider: p,
  onConnect,
}: Readonly<{ provider: ShopPaymentProvider; onConnect: () => void }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const invalidate = useInvalidateShop();
  const disconnect = useMutation({
    mutationFn: disconnectShopPaymentProvider,
    onSuccess: () => {
      toast.success(t("Disconnected"));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not disconnect"))),
  });
  const makeDefault = useMutation({
    mutationFn: (provider: PaymentProviderId) =>
      updateShopStore({ defaultPaymentProvider: provider }),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save"))),
  });
  const onDisconnect = async () => {
    const ok = await confirm({
      title: t("Disconnect {provider}?", { provider: p.label }),
      description: t("Payment links already sent stop confirming orders automatically."),
      confirmText: t("Disconnect"),
    });
    if (ok) disconnect.mutate(p.id);
  };
  const description =
    p.id === "stripe"
      ? t("Cards, Apple Pay and Google Pay. Payouts go to your Stripe account.")
      : t("Cards, wallets and local methods. Payouts go to your Razorpay account.");

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-[15px] font-bold">{p.label}</span>
        {p.connected ? (
          <ToneBadge tone="ok">{p.isDefault ? t("Connected · default") : t("Connected")}</ToneBadge>
        ) : (
          <ToneBadge tone="mute">{t("Not connected")}</ToneBadge>
        )}
        {p.connected && p.livemode === false && <ToneBadge tone="warn">{t("Test mode")}</ToneBadge>}
        {p.connected && p.livemode === true && <ToneBadge tone="info">{t("Live")}</ToneBadge>}
      </div>
      <p className="text-sm text-muted-foreground">
        {p.accountName ? `${p.accountName} · ` : ""}
        {description}
      </p>
      {p.lastError && <p className="text-sm text-destructive">{p.lastError}</p>}
      {p.connected && p.id === "stripe" && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <IconCircleCheck className="size-4 text-green-600 dark:text-green-500" aria-hidden />
          {t("Webhooks are set up automatically.")}
        </p>
      )}
      {p.connected && p.id === "razorpay" && <RazorpayWebhookSetup provider={p} />}
      <div className="mt-auto flex flex-wrap gap-2">
        {p.connected ? (
          <>
            {!p.isDefault && (
              <Button
                size="sm"
                variant="outline"
                loading={makeDefault.isPending}
                onClick={() => makeDefault.mutate(p.id)}
              >
                {t("Make default")}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => void onDisconnect()}>
              {t("Disconnect")}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onConnect}>
            {p.id === "stripe" ? t("Connect Stripe") : t("Connect Razorpay")}
          </Button>
        )}
      </div>
    </Card>
  );
}

/** "Working" once a signed webhook has arrived; until then the merchant's setup is unproven. */
function WebhookStatus({ provider }: Readonly<{ provider: ShopPaymentProvider }>) {
  const { t } = useTranslation();
  if (provider.lastWebhookAt) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
        <IconCircleCheck className="size-4" aria-hidden />
        {t("Working · last received {time}", { time: dayjs(provider.lastWebhookAt).fromNow() })}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-500">
      <IconClock className="size-4" aria-hidden />
      {provider.webhookConfigured
        ? t("Waiting for the first webhook")
        : t("Webhook not set up yet")}
    </span>
  );
}

function RazorpayWebhookSetup({ provider }: Readonly<{ provider: ShopPaymentProvider }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [open, setOpen] = useState(!provider.webhookConfigured);
  const [secret, setSecret] = useState("");
  const save = useMutation({
    mutationFn: () => setShopPaymentWebhookSecret("razorpay", secret.trim()),
    onSuccess: () => {
      toast.success(t("Webhook secret saved"));
      setSecret("");
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save the webhook secret"))),
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <WebhookStatus provider={provider} />
        <Button type="button" size="xs" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? t("Hide steps") : t("Show setup steps")}
        </Button>
      </div>
      {open && (
        <ol className="flex flex-col gap-3 text-sm">
          <WebhookStep n={1}>
            <span>
              {t("Open the Razorpay Dashboard and go to Account & Settings → Webhooks.")}{" "}
              <a
                href="https://dashboard.razorpay.com/app/webhooks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                {t("Open Razorpay")}
                <IconExternalLink className="size-3.5" aria-hidden />
              </a>
            </span>
          </WebhookStep>
          <WebhookStep n={2}>
            <span>{t("Add a new webhook and paste this URL.")}</span>
            <CopyField value={provider.webhookUrl} label={t("Copy webhook URL")} />
          </WebhookStep>
          <WebhookStep n={3}>
            <span>{t("Tick these three events.")}</span>
            <span className="flex flex-col gap-1.5">
              {RAZORPAY_EVENTS.map((event) => (
                <CopyField key={event} value={event} label={t("Copy {event}", { event: event })} />
              ))}
            </span>
          </WebhookStep>
          <WebhookStep n={4}>
            <span>
              {t("Choose a secret in Razorpay, save the webhook, then paste the same secret here.")}
            </span>
            <span className="flex gap-2">
              <Input
                type="password"
                autoComplete="off"
                placeholder={t("Webhook secret")}
                aria-label={t("Webhook secret")}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                loading={save.isPending}
                disabled={secret.trim().length < 5}
                onClick={() => save.mutate()}
              >
                {t("Save")}
              </Button>
            </span>
          </WebhookStep>
        </ol>
      )}
    </div>
  );
}

function WebhookStep({ n, children }: Readonly<{ n: number; children: ReactNode }>) {
  return (
    <li className="flex gap-3">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</span>
    </li>
  );
}

function ConnectGatewayDialog({
  provider,
  onClose,
}: Readonly<{ provider: PaymentProviderId; onClose: () => void }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [apiKey, setApiKey] = useState("");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const connect = useMutation({
    mutationFn: () =>
      connectShopPaymentProvider(
        provider,
        provider === "stripe"
          ? { apiKey: apiKey.trim() }
          : { keyId: keyId.trim(), keySecret: keySecret.trim() },
      ),
    onSuccess: () => {
      toast.success(t("Connected"));
      void invalidate();
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not connect"))),
  });
  const valid =
    provider === "stripe"
      ? apiKey.trim().length >= 10
      : keyId.trim().length >= 5 && keySecret.trim().length >= 5;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {provider === "stripe" ? t("Connect Stripe") : t("Connect Razorpay")}
          </DialogTitle>
          <DialogDescription>
            {provider === "stripe"
              ? t(
                  "Paste a secret or restricted key from the Developers section of your Stripe dashboard. We register the webhook for you. A test key (sk_test_…) lets you try a test order without real charges.",
                )
              : t(
                  "Paste the key ID and secret from Account & Settings → API keys in your Razorpay dashboard. Test-mode keys let you try a test order without real charges.",
                )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) connect.mutate();
          }}
        >
          {provider === "stripe" ? (
            <Field>
              <FieldLabel htmlFor="stripe-key">{t("Secret key")}</FieldLabel>
              <Input
                id="stripe-key"
                type="password"
                autoComplete="off"
                placeholder="sk_live_…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field>
                <FieldLabel htmlFor="rzp-id">{t("Key ID")}</FieldLabel>
                <Input
                  id="rzp-id"
                  autoComplete="off"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rzp-secret">{t("Key secret")}</FieldLabel>
                <Input
                  id="rzp-secret"
                  type="password"
                  autoComplete="off"
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button type="submit" loading={connect.isPending} disabled={!valid}>
              {t("Connect")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function paymentOptionsDraft(store: ShopStore) {
  const bank = store.bankDetails ?? {};
  return {
    codEnabled: store.codEnabled,
    codConfirm: store.codConfirm,
    codConfirmHours: String(store.codConfirmHours),
    codPrepaidDiscountPct:
      store.codPrepaidDiscountPct === null ? "" : String(toMoney(store.codPrepaidDiscountPct)),
    bankTransferEnabled: store.bankTransferEnabled,
    bankTransferHours: String(store.bankTransferHours),
    accountName: bank.accountName ?? "",
    accountNumber: bank.accountNumber ?? "",
    bankName: bank.bankName ?? "",
    routingCode: bank.routingCode ?? "",
    instructions: bank.instructions ?? "",
    invoiceAutoSend: store.invoiceAutoSend,
    invoicePrefix: store.invoicePrefix,
    taxId: store.taxId ?? "",
    businessAddress: store.businessAddress ?? "",
  };
}
type PaymentOptionsDraft = ReturnType<typeof paymentOptionsDraft>;

const paymentOptionsPatch = (d: PaymentOptionsDraft): ShopStoreUpdate => ({
  codEnabled: d.codEnabled,
  codConfirm: d.codConfirm,
  codConfirmHours: Number(d.codConfirmHours) || 24,
  codPrepaidDiscountPct: numOrNull(d.codPrepaidDiscountPct),
  bankTransferEnabled: d.bankTransferEnabled,
  bankTransferHours: Number(d.bankTransferHours) || 72,
  bankDetails: {
    accountName: d.accountName.trim() || undefined,
    accountNumber: d.accountNumber.trim() || undefined,
    bankName: d.bankName.trim() || undefined,
    routingCode: d.routingCode.trim() || undefined,
    instructions: d.instructions.trim() || undefined,
  },
  invoiceAutoSend: d.invoiceAutoSend,
  invoicePrefix: d.invoicePrefix.trim(),
  taxId: d.taxId.trim() || null,
  businessAddress: d.businessAddress.trim() || null,
});

function PaymentOptionsForm({
  initial,
  canManage,
}: Readonly<{ initial: PaymentOptionsDraft; canManage: boolean }>) {
  const { t } = useTranslation();
  const s = useStoreSection(initial, paymentOptionsPatch);
  return (
    <>
      <ShopSection
        title={t("Cash on delivery")}
        description={t(
          "Fewer refused parcels — confirm every cash order on WhatsApp before you pack it.",
        )}
        actions={
          <Switch
            aria-label={t("Cash on delivery")}
            checked={s.draft.codEnabled}
            onCheckedChange={(v) => s.set({ codEnabled: v })}
          />
        }
      >
        {s.draft.codEnabled && (
          <>
            <SettingRow
              title={t("Ask the customer to confirm")}
              description={t(
                "They get Confirm and Cancel buttons. Unconfirmed orders are cancelled after the time below.",
              )}
              control={
                <Switch
                  aria-label={t("Ask the customer to confirm")}
                  checked={s.draft.codConfirm}
                  onCheckedChange={(v) => s.set({ codConfirm: v })}
                />
              }
            >
              {s.draft.codConfirm && (
                <Field className="w-48">
                  <FieldLabel htmlFor="cod-hours">{t("Hours to confirm")}</FieldLabel>
                  <Input
                    id="cod-hours"
                    inputMode="numeric"
                    value={s.draft.codConfirmHours}
                    onChange={(e) => s.set({ codConfirmHours: e.target.value })}
                  />
                </Field>
              )}
            </SettingRow>
            <SettingRow
              title={t("Offer a discount to pay online instead")}
              description={t(
                "Sent with the confirmation, together with a payment link. Leave empty for no offer.",
              )}
              control={
                <span className="flex items-center gap-1.5">
                  <Input
                    className="w-20"
                    inputMode="decimal"
                    aria-label={t("Discount percent")}
                    value={s.draft.codPrepaidDiscountPct}
                    onChange={(e) => s.set({ codPrepaidDiscountPct: e.target.value })}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </span>
              }
            />
          </>
        )}
      </ShopSection>

      <ShopSection
        title={t("Bank transfer")}
        description={t(
          "We send your bank details; you mark the order paid when the money arrives.",
        )}
        actions={
          <Switch
            aria-label={t("Bank transfer")}
            checked={s.draft.bankTransferEnabled}
            onCheckedChange={(v) => s.set({ bankTransferEnabled: v })}
          />
        }
      >
        {s.draft.bankTransferEnabled && (
          <div className="flex flex-col gap-4">
            <BankFields draft={s.draft} set={s.set} />
            <Field className="w-56">
              <FieldLabel htmlFor="bank-hours">{t("Hours to pay before cancelling")}</FieldLabel>
              <Input
                id="bank-hours"
                inputMode="numeric"
                value={s.draft.bankTransferHours}
                onChange={(e) => s.set({ bankTransferHours: e.target.value })}
              />
            </Field>
          </div>
        )}
      </ShopSection>

      <ShopSection
        title={t("Invoices")}
        description={t(
          "Every paid order gets a PDF invoice you can download from the order. These details are printed on it.",
        )}
      >
        <SettingRow
          title={t("Send invoices automatically")}
          description={t(
            "The customer gets the invoice in the chat as soon as they pay. On WhatsApp it goes out while the 24-hour window is open.",
          )}
          control={
            <Switch
              aria-label={t("Send invoices automatically")}
              checked={s.draft.invoiceAutoSend}
              onCheckedChange={(v) => s.set({ invoiceAutoSend: v })}
            />
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="invoice-prefix">{t("Invoice number prefix")}</FieldLabel>
            <Input
              id="invoice-prefix"
              maxLength={12}
              placeholder="INV-"
              value={s.draft.invoicePrefix}
              onChange={(e) => s.set({ invoicePrefix: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invoice-tax-id">{t("Tax ID")}</FieldLabel>
            <Input
              id="invoice-tax-id"
              maxLength={40}
              value={s.draft.taxId}
              onChange={(e) => s.set({ taxId: e.target.value })}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="invoice-address">{t("Business address and contact")}</FieldLabel>
          <Textarea
            id="invoice-address"
            rows={3}
            maxLength={400}
            placeholder={t("Street, city, email or phone, one per line")}
            value={s.draft.businessAddress}
            onChange={(e) => s.set({ businessAddress: e.target.value })}
          />
        </Field>
      </ShopSection>

      {canManage && (
        <SettingsSaveBar
          dirty={s.dirty}
          saving={s.save.isPending}
          onSave={() => s.save.mutate()}
          onDiscard={s.reset}
        />
      )}
    </>
  );
}

type BankDraft = Pick<
  PaymentOptionsDraft,
  "accountName" | "accountNumber" | "bankName" | "routingCode" | "instructions"
>;

function BankFields({
  draft,
  set,
}: Readonly<{ draft: BankDraft; set: (patch: Partial<BankDraft>) => void }>) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="bank-name">{t("Bank name")}</FieldLabel>
        <Input
          id="bank-name"
          value={draft.bankName}
          maxLength={80}
          onChange={(e) => set({ bankName: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="bank-account-name">{t("Account name")}</FieldLabel>
        <Input
          id="bank-account-name"
          value={draft.accountName}
          maxLength={80}
          onChange={(e) => set({ accountName: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="bank-account-number">{t("Account number or IBAN")}</FieldLabel>
        <Input
          id="bank-account-number"
          value={draft.accountNumber}
          maxLength={40}
          onChange={(e) => set({ accountNumber: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="bank-routing">{t("Routing, sort or SWIFT code")}</FieldLabel>
        <Input
          id="bank-routing"
          value={draft.routingCode}
          maxLength={40}
          onChange={(e) => set({ routingCode: e.target.value })}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="bank-instructions">{t("Instructions")}</FieldLabel>
        <Textarea
          id="bank-instructions"
          rows={2}
          maxLength={300}
          placeholder={t("Use your order number as the payment reference.")}
          value={draft.instructions}
          onChange={(e) => set({ instructions: e.target.value })}
        />
      </Field>
    </div>
  );
}

/**
 * The setup page's version of the offline methods: one switch each, saved as it flips. Bank
 * details are a longer form, so that card points to Settings once it is on.
 */
export function OfflinePaymentCards({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const canManage = useCan("commerce.payments.manage");
  const toggle = useMutation({
    mutationFn: updateShopStore,
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save"))),
  });
  const hasBankDetails = Boolean(
    store.bankDetails?.accountNumber || store.bankDetails?.instructions,
  );
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card size="sm" className="gap-2 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[15px] font-bold">{t("Cash on delivery")}</span>
          <Switch
            aria-label={t("Cash on delivery")}
            disabled={!canManage || toggle.isPending}
            checked={store.codEnabled}
            onCheckedChange={(v) => toggle.mutate({ codEnabled: v })}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Customers pay when the parcel arrives. We ask them to confirm on WhatsApp first.")}
        </p>
      </Card>
      <Card size="sm" className="gap-2 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[15px] font-bold">{t("Bank transfer")}</span>
          <Switch
            aria-label={t("Bank transfer")}
            disabled={!canManage || toggle.isPending}
            checked={store.bankTransferEnabled}
            onCheckedChange={(v) => toggle.mutate({ bankTransferEnabled: v })}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("We send your bank details and you mark the order paid when the money arrives.")}
        </p>
        {store.bankTransferEnabled && !hasBankDetails && (
          <Link
            {...settingsTab("payments")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("Add your bank details in Commerce → Settings → Getting paid")}
          </Link>
        )}
      </Card>
    </div>
  );
}
