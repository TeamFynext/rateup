import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type {
  ShopNotificationEvent,
  ShopStore,
  ShopStoreUpdate,
} from "@/backend/commerce/shop.api";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import { Switch } from "@/components/ui/switch.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { WaTemplateStatus } from "@/types/enums.ts";

import { SettingsSaveBar } from "../shop/SettingsSaveBar.tsx";
import { SettingRow, ShopSection } from "../shop/ShopUi.tsx";
import { useStoreSection } from "../shop/useStoreSection.ts";

const NONE = "none";

function notificationEvents(t: TFunction) {
  return [
    { key: "placed", label: t("Order placed"), defaultOn: true },
    { key: "paid", label: t("Payment received"), defaultOn: true },
    { key: "cod_confirm", label: t("Confirm a cash order"), defaultOn: true },
    { key: "packed", label: t("Packed"), defaultOn: false },
    { key: "shipped", label: t("Shipped, with tracking"), defaultOn: true },
    { key: "out_for_delivery", label: t("Out for delivery"), defaultOn: true },
    { key: "delivered", label: t("Delivered"), defaultOn: true },
    { key: "delivery_failed", label: t("Delivery failed"), defaultOn: true },
    { key: "cancelled", label: t("Cancelled"), defaultOn: true },
    { key: "refunded", label: t("Refunded"), defaultOn: true },
    { key: "payment_reminder", label: t("Payment reminder"), defaultOn: true },
    { key: "cart_reminder", label: t("Cart reminder"), defaultOn: true },
    { key: "back_in_stock", label: t("Back in stock"), defaultOn: true },
    { key: "review_request", label: t("Ask for a review"), defaultOn: true },
  ] satisfies { key: ShopNotificationEvent; label: string; defaultOn: boolean }[];
}

type MessageDraft = Record<string, { enabled: boolean; waTemplateId: string }>;

const messagesPatch = (d: MessageDraft): ShopStoreUpdate => ({
  notifications: Object.fromEntries(
    Object.entries(d).map(([k, v]) => [
      k,
      { enabled: v.enabled, waTemplateId: v.waTemplateId || null },
    ]),
  ),
});

export function MessagesTab({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const { canAny } = usePermissions();
  const canManage = canAny(["commerce.payments.manage", "commerce.storefront.manage"]);
  const current = store.notifications ?? {};
  const initial: MessageDraft = Object.fromEntries(
    notificationEvents(t).map((e) => [
      e.key,
      {
        enabled: current[e.key]?.enabled ?? e.defaultOn,
        waTemplateId: current[e.key]?.waTemplateId ?? "",
      },
    ]),
  );
  return (
    <fieldset disabled={!canManage} className="flex min-w-0 flex-col gap-5">
      <MessagesForm key={JSON.stringify(initial)} initial={initial} canManage={canManage} />
    </fieldset>
  );
}

function MessagesForm({
  initial,
  canManage,
}: Readonly<{ initial: MessageDraft; canManage: boolean }>) {
  const { t } = useTranslation();
  const { data: templates = [] } = useWaTemplates();
  const approved = templates.filter((tpl) => tpl.data?.status === WaTemplateStatus.APPROVED);
  const s = useStoreSection(initial, messagesPatch);
  const items = [
    { value: NONE, label: t("Only inside the 24-hour window") },
    ...approved.map((tpl) => ({ value: tpl.id, label: tpl.data.name })),
  ];

  return (
    <>
      <ShopSection
        title={t("Customer messages")}
        description={t(
          "What customers hear about their order. Inside WhatsApp's 24-hour window we send a plain message; outside it, only an approved template can reach them.",
        )}
      >
        {notificationEvents(t).map((e) => {
          const row = s.draft[e.key] ?? { enabled: e.defaultOn, waTemplateId: "" };
          return (
            <SettingRow
              key={e.key}
              title={e.label}
              control={
                <span className="flex items-center gap-3">
                  {row.enabled && (
                    <Select
                      value={row.waTemplateId || NONE}
                      onValueChange={(value) =>
                        s.set({
                          [e.key]: { ...row, waTemplateId: value && value !== NONE ? value : "" },
                        })
                      }
                      items={items}
                    >
                      <SelectTrigger
                        className="hidden w-56 sm:flex"
                        aria-label={t("Template for {event}", { event: e.label })}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Switch
                    aria-label={e.label}
                    checked={row.enabled}
                    onCheckedChange={(v) => s.set({ [e.key]: { ...row, enabled: v } })}
                  />
                </span>
              }
            />
          );
        })}
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
