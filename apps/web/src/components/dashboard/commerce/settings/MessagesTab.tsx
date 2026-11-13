import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Switch } from "@rateup/ui/components/switch";
import { IconArrowBackUp, IconPencil, IconSend } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  saveShopMessage,
  updateShopStore,
  type SaveShopMessageResult,
  type ShopMessage,
  type ShopMessageParam,
  type ShopMessageTemplateStatus,
  type ShopNotificationEvent,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop, useShopMessages } from "@/backend/commerce/shop.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { LoyaltyTemplateStatusBadge } from "@/components/dashboard/loyalty/messages/LoyaltyTemplateStatusBadge.tsx";
import { MessageBodyEditor } from "@/components/dashboard/loyalty/messages/MessageBodyEditor.tsx";
import { MessageBubble } from "@/components/dashboard/loyalty/messages/MessageBubble.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { WaTemplateStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { ShopSection } from "../shop/ShopUi.tsx";

/**
 * Settings › Messages: what the shop tells customers on its own, one card per message, the
 * way loyalty's automatic messages work. The store writes the words; saving keeps them and
 * submits them to Meta as the message's WhatsApp template, so the same words go out inside
 * the 24-hour window (and on Instagram and Messenger) and, once approved, outside it.
 */

interface MessageCopy {
  label: string;
  description: string;
}

function messageCopy(t: TFunction): Record<ShopNotificationEvent, MessageCopy> {
  return {
    placed: {
      label: t("Cash order placed"),
      description: t("A cash on delivery order, when the store doesn't ask for confirmation."),
    },
    cod_confirm: {
      label: t("Confirm a cash order"),
      description: t("Asks the customer to confirm a cash on delivery order, with buttons."),
    },
    bank_transfer: {
      label: t("Bank transfer details"),
      description: t("Tells the customer where to send the money for a bank transfer order."),
    },
    paid: {
      label: t("Payment received"),
      description: t("Once an online payment goes through."),
    },
    cod_confirmed: {
      label: t("Cash order confirmed"),
      description: t("After the customer confirms a cash on delivery order."),
    },
    packed: { label: t("Packed"), description: t("When the order is marked packed.") },
    shipped: {
      label: t("Shipped"),
      description: t("When the order ships, with its tracking link."),
    },
    out_for_delivery: {
      label: t("Out for delivery"),
      description: t("On the day the courier takes it out."),
    },
    delivered: { label: t("Delivered"), description: t("When the order arrives.") },
    delivery_failed: {
      label: t("Delivery failed"),
      description: t("When the courier couldn't deliver it."),
    },
    cancelled: { label: t("Cancelled"), description: t("When the order is cancelled.") },
    refunded: { label: t("Refunded"), description: t("When the order is refunded.") },
    payment_reminder: {
      label: t("Payment reminder"),
      description: t("When a payment link is still unpaid."),
    },
    cart_reminder: {
      label: t("Cart reminder"),
      description: t("When a customer leaves items in their cart."),
    },
    back_in_stock: {
      label: t("Back in stock"),
      description: t("To customers who asked to hear when a product returns."),
    },
    review_request: {
      label: t("Ask for a review"),
      description: t("Two days after delivery, with rating buttons."),
    },
  };
}

function paramLabels(t: TFunction): Record<ShopMessageParam, string> {
  return {
    name: t("Customer's first name"),
    orderNumber: t("Order number"),
    total: t("Order total"),
    trackingUrl: t("Tracking link"),
    carrier: t("Carrier"),
    cancelReason: t("Cancellation reason"),
    bankDetails: t("Bank details"),
    bankInstructions: t("Bank transfer instructions"),
    storeName: t("Store name"),
    productName: t("Product name"),
    itemCount: t("Number of items"),
    discountCode: t("Discount code"),
    orderLink: t("Order link"),
    payLink: t("Payment link"),
    checkoutLink: t("Checkout link"),
    items: t("Items ordered"),
    deliveryAddress: t("Delivery address"),
  };
}

const ORDER_UPDATES: ShopNotificationEvent[] = [
  "placed",
  "cod_confirm",
  "bank_transfer",
  "paid",
  "cod_confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "cancelled",
  "refunded",
];
const REMINDERS: ShopNotificationEvent[] = [
  "payment_reminder",
  "cart_reminder",
  "back_in_stock",
  "review_request",
];

/** The picker's "no template" choice; Base UI selects need a string value. */
const NONE = "none";

const PLACEHOLDER = /\{\{(\d+)\}\}/g;

/** How much of a long message a card shows before "Show full message". */
const PREVIEW_LENGTH = 280;

/** The start of a long message, cut at a space so no word or `{{n}}` is split. */
function preview(body: string): string {
  const cut = body.lastIndexOf(" ", PREVIEW_LENGTH);
  return `${body.slice(0, cut > 0 ? cut : PREVIEW_LENGTH).trimEnd()}…`;
}

/** WhatsApp's limit on a template's text, which the API holds every message to. */
const MAX_LENGTH = 1024;

/** The API refuses what fails here; saying so while typing saves the round trip. */
function bodyProblem(t: TFunction, body: string, count: number): string | null {
  if (!body.trim()) return t("Write something first.");
  const length = body.trim().length;
  if (length > MAX_LENGTH) {
    return t(
      "This message is too long for WhatsApp. Remove {extra, plural, one {# character} other {# characters}} to save it.",
      { extra: length - MAX_LENGTH },
    );
  }
  const bad = [...body.matchAll(PLACEHOLDER)]
    .map((m) => Number(m[1]))
    .find((i) => i < 1 || i > count);
  return bad === undefined
    ? null
    : t(
        "This message has {count, plural, one {one variable} other {# variables}}; remove the extra one.",
        {
          count,
        },
      );
}

/** The badge's own vocabulary is Meta's enum. */
const META_STATUS = {
  approved: WaTemplateStatus.APPROVED,
  rejected: WaTemplateStatus.REJECTED,
  pending: WaTemplateStatus.PENDING,
  draft: WaTemplateStatus.DRAFT,
} as const;

export function MessagesTab() {
  const { t } = useTranslation();
  const { canAny } = usePermissions();
  const canManage = canAny(["commerce.payments.manage", "commerce.storefront.manage"]);
  const { data: messages, isPending, error } = useShopMessages();
  const { data: templates = [] } = useWaTemplates();
  const templateItems = templates
    .filter((tpl) => tpl.data?.status === WaTemplateStatus.APPROVED)
    .map((tpl) => ({ value: tpl.id, label: tpl.data.name }));

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(error, t("Could not load messages"))}
        </AlertDescription>
      </Alert>
    );
  }

  const byKey = new Map(messages.map((m) => [m.key, m]));
  const copy = messageCopy(t);
  const section = (keys: ShopNotificationEvent[]) =>
    keys.flatMap((key) => {
      const message = byKey.get(key);
      return message
        ? [
            <ShopMessageCard
              key={key}
              message={message}
              copy={copy[key]}
              canManage={canManage}
              templateItems={templateItems}
            />,
          ]
        : [];
    });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ShopSection
        title={t("Order updates")}
        description={t(
          "What customers hear about their order. Each message says what goes out to customers who wrote to you in the last 24 hours, and to everyone else.",
        )}
      >
        <div className="flex flex-col gap-3">{section(ORDER_UPDATES)}</div>
      </ShopSection>
      <ShopSection
        title={t("Reminders")}
        description={t("Nudges that bring customers back to finish, pay or review.")}
      >
        <div className="flex flex-col gap-3">{section(REMINDERS)}</div>
      </ShopSection>
    </div>
  );
}

/** What one of a template's variables gets: the message's variable at the same position. */
function variableCount(text: string | null): number {
  if (!text) return 0;
  const found = [...text.matchAll(PLACEHOLDER)].map((m) => Number(m[1]));
  return found.length ? Math.max(...found) : 0;
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function ShopMessageCard({
  message,
  copy,
  canManage,
  templateItems,
}: Readonly<{
  message: ShopMessage;
  copy: MessageCopy;
  canManage: boolean;
  templateItems: ReadonlyArray<{ value: string; label: string }>;
}>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  // The last attempt's word on making a template; the reason is only known at that moment.
  const [templateError, setTemplateError] = useState<string | null>(null);

  const labels = paramLabels(t);
  const variables = message.params.map((p, i) => ({ token: `{{${i + 1}}}`, label: labels[p] }));
  const problem = editing ? bodyProblem(t, draft, message.params.length) : null;
  const long = message.body.length > PREVIEW_LENGTH;

  const onError = (e: unknown) => toast.error(getApiErrorMessage(e, t("Could not save")));
  const save = useMutation({
    mutationFn: (input: { body: string | null; makeTemplate?: boolean }) =>
      saveShopMessage(message.key, input),
    onSuccess: (result: SaveShopMessageResult, input) => {
      setTemplateError(result.templateError);
      if (!input.makeTemplate) toast.success(t("Saved"));
      else if (result.templateError) toast.warning(t("Saved. The WhatsApp template wasn't made."));
      else toast.success(t("Sent to Meta for approval"));
      setEditing(false);
      void invalidate();
    },
    onError,
  });
  const update = useMutation({
    mutationFn: (patch: { enabled?: boolean; waTemplateId?: string | null }) =>
      updateShopStore({ notifications: { [message.key]: patch } }),
    onSuccess: () => {
      toast.success(t("Saved"));
      void invalidate();
    },
    onError,
  });
  const makeTemplate = () =>
    save.mutate({ body: message.customBody ? message.body : null, makeTemplate: true });

  const statusLabel: Record<ShopMessageTemplateStatus, string> = {
    approved: t("Approved"),
    pending: t("Awaiting Meta"),
    rejected: t("Rejected by Meta"),
    draft: t("Draft"),
  };
  const current = message.waTemplateId;
  // The library lists approved templates only; the message's own one is usually still with
  // Meta, so it is added by name, or the picker would show its bare id.
  const pickerItems = [
    { value: NONE, label: t("None: open chats only") },
    ...(current && !templateItems.some((item) => item.value === current)
      ? [
          {
            value: current,
            label: [
              message.templateName ?? t("This message's template"),
              message.templateStatus ? statusLabel[message.templateStatus] : null,
            ]
              .filter(Boolean)
              .join(" · "),
          },
        ]
      : []),
    ...templateItems,
  ];

  const templateVars = variables.slice(0, variableCount(message.templateBody));
  // A button a customer taps must carry the same words as the chat button, or the tap does
  // nothing.
  const missingButtons =
    message.templateKind === "picked"
      ? message.quickReplies.filter(
          (title) => !message.templateQuickReplies.some((b) => sameTitle(b, title)),
        )
      : [];
  const approved = message.templateStatus === "approved";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{copy.label}</p>
            {!message.enabled ? (
              <Badge variant="outline">{t("Off")}</Badge>
            ) : current && approved ? (
              <Badge
                variant="secondary"
                className="bg-green-600/10 text-green-700 dark:text-green-500"
              >
                {t("Reaches every customer")}
              </Badge>
            ) : (
              <Badge variant="outline">{t("Open chats only")}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{copy.description}</p>
        </div>
        <Switch
          checked={message.enabled}
          onCheckedChange={(enabled) => update.mutate({ enabled })}
          disabled={!canManage || update.isPending}
          aria-label={copy.label}
        />
      </div>

      {/* ── 1. Inside the 24-hour window: the store's words ── */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground">
            {t("Customer wrote in the last 24 hours")}
          </h4>
          <span className="text-xs text-muted-foreground">
            {t("Sent as a chat message, also on Instagram and Messenger")}
          </span>
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            <MessageBodyEditor
              id={`shop-message-${message.key}`}
              value={draft}
              onChange={setDraft}
              variables={variables}
              invalid={Boolean(problem)}
              rows={5}
            />
            <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
              {problem ? (
                <p className="text-destructive">{problem}</p>
              ) : (
                <p className="max-w-prose text-muted-foreground">
                  {t(
                    "Words inside double square brackets are left out when the value in them is empty.",
                  )}
                </p>
              )}
              <p
                className={
                  draft.trim().length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
                }
              >
                {t("{count} of {max} characters", {
                  count: draft.trim().length,
                  max: MAX_LENGTH,
                })}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {message.customBody && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto"
                  onClick={() => save.mutate({ body: null })}
                  disabled={save.isPending}
                >
                  <IconArrowBackUp size={14} />
                  {t("Use the default words")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={save.isPending}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="sm"
                loading={save.isPending}
                onClick={() => save.mutate({ body: draft.trim() })}
                disabled={Boolean(problem)}
              >
                {t("Save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <MessageBubble text={long && !expanded ? preview(message.body) : message.body} />
            {long && (
              <Button
                variant="link"
                size="xs"
                className="self-start px-0"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? t("Show less") : t("Show full message")}
              </Button>
            )}
            <QuickReplies titles={message.quickReplies} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-muted-foreground">
                {variables.map((v) => `${v.token} ${v.label}`).join(" · ")}
              </p>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(message.body);
                    setEditing(true);
                  }}
                >
                  <IconPencil size={14} />
                  {t("Edit message")}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Outside the window: an approved template, or nothing ── */}
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-foreground">
            {t("No message from them in 24 hours")}
          </h4>
          <span className="text-xs text-muted-foreground">
            {t("WhatsApp only allows an approved template")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={current ?? NONE}
            items={pickerItems}
            onValueChange={(value) =>
              update.mutate({ waTemplateId: value && value !== NONE ? value : null })
            }
            disabled={!canManage || update.isPending}
          >
            <SelectTrigger
              className="h-9 w-full sm:w-80"
              aria-label={t("Template for {event}", { event: copy.label })}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pickerItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {current && message.templateStatus && (
            <LoyaltyTemplateStatusBadge status={META_STATUS[message.templateStatus]} />
          )}
          {canManage && message.templateKind !== "own" && (
            <Button variant="ghost" size="sm" loading={save.isPending} onClick={makeTemplate}>
              <IconSend size={14} />
              {t("Make a template from my words")}
            </Button>
          )}
        </div>

        {!current ? (
          <p className="text-xs text-muted-foreground">
            {t(
              "Customers who haven't written to you in 24 hours don't get this message. Pick a template to reach them too.",
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {message.templateBody && <MessageBubble text={message.templateBody} />}
            <QuickReplies titles={message.templateQuickReplies} />
            {templateVars.length > 0 && (
              <p className="font-mono text-[11px] text-muted-foreground">
                {t("Filled with")} {templateVars.map((v) => `${v.token} ${v.label}`).join(" · ")}
              </p>
            )}
            {!approved && (
              <p className="text-xs text-muted-foreground">
                {t("Until Meta approves it, these customers get nothing.")}
              </p>
            )}
          </div>
        )}

        {missingButtons.length > 0 && (
          <Alert>
            <AlertDescription>
              {t(
                "This template needs quick-reply buttons named {buttons} for customers to answer from it.",
                { buttons: missingButtons.map((b) => `“${b}”`).join(", ") },
              )}
            </AlertDescription>
          </Alert>
        )}
        {message.templateKind === "own" && message.templateOutdated && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{t("This template still has your old words.")}</span>
              {canManage && (
                <Button variant="outline" size="sm" loading={save.isPending} onClick={makeTemplate}>
                  {t("Update the template")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {templateError && (
          <Alert>
            <AlertDescription>
              {t("The template wasn't made: {reason}", { reason: templateError })}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}

/** Quick replies as WhatsApp draws them under a message. */
function QuickReplies({ titles }: Readonly<{ titles: readonly string[] }>) {
  if (titles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {titles.map((title) => (
        <span
          key={title}
          className="flex items-center gap-1 rounded-lg bg-muted/60 px-3 py-1 text-sm font-medium text-primary"
        >
          <IconArrowBackUp size={14} />
          {title}
        </span>
      ))}
    </div>
  );
}
