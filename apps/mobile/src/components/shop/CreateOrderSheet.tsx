import * as Clipboard from "expo-clipboard";
import { Check, CheckCircle2, Copy, Share2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";

import { shopErrorMessage } from "@/api/shop/shop.api";
import { useCreateOrder, useShopStore } from "@/api/shop/shop.query";
import type { ChatChannel, CreateOrderResult } from "@/api/shop/shop.type";
import SegmentedControl from "@/components/common/SegmentedControl";
import {
  Badge,
  Card,
  CashierButton,
  CashierInput,
  FONT,
  InlineError,
  NUM,
  useTheme,
} from "@/components/loyalty/cashier/ui";

import { money, orderNumber } from "./orderFormat";
import ProductPicker, { type PickedLine } from "./ProductPicker";
import ShopSheet from "./ShopSheet";

type SendMode = "payment_link" | "checkout_link";

const SEND_OPTIONS: readonly { value: SendMode; label: string }[] = [
  { value: "payment_link", label: "Payment link" },
  { value: "checkout_link", label: "Checkout link" },
];

export default function CreateOrderSheet({
  visible,
  onClose,
  contactId,
  channel,
  channelAccountId,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  contactId: string;
  channel: ChatChannel;
  channelAccountId: string | null;
}>) {
  const { t } = useTheme();
  const { data: store } = useShopStore(visible);
  const create = useCreateOrder();
  const currency = store?.currency ?? "";

  const [lines, setLines] = useState<Record<string, PickedLine>>({});
  const [coupon, setCoupon] = useState("");
  const [rateId, setRateId] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<SendMode>("payment_link");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateOrderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const picked = useMemo(() => Object.values(lines).filter((l) => l.quantity > 0), [lines]);
  const itemCount = picked.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = picked.reduce((sum, l) => sum + l.price * l.quantity, 0);
  // Paid on the store's own checkout, which takes delivery, codes and payment itself.
  const inStore = Boolean(store && store.checkoutVia !== "RATEUP");
  const rates = inStore ? [] : (store?.shippingRates ?? []).filter((r) => r.active);
  const mode: SendMode = inStore ? "checkout_link" : sendMode;

  const close = () => {
    setLines({});
    setCoupon("");
    setRateId(null);
    setSendMode("payment_link");
    setError(null);
    setResult(null);
    setCopied(false);
    create.reset();
    onClose();
  };

  const onQuantity = (line: PickedLine) => {
    setError(null);
    setLines((current) => {
      const next = { ...current };
      if (line.quantity > 0) next[line.variantId] = line;
      else delete next[line.variantId];
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    try {
      const outcome = await create.mutateAsync({
        contactId,
        channel,
        channelAccountId,
        items: picked.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        discountCode: inStore ? null : coupon.trim() || null,
        shippingRateId: rateId,
        send: mode,
      });
      setResult(outcome);
    } catch (e) {
      setError(shopErrorMessage(e, "Could not create the order"));
    }
  };

  if (result) {
    const { order, delivery } = result;
    const url = delivery.url;
    const copy = async () => {
      if (!url) return;
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    const share = () => {
      if (url) Share.share({ message: url }).catch(() => undefined);
    };

    return (
      <ShopSheet
        visible={visible}
        title={`Order ${orderNumber(order)}`}
        onClose={close}
        footer={<CashierButton label="Done" onPress={close} />}
      >
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
            <CheckCircle2 size={36} color={t.success} />
            <Text style={{ ...NUM, fontFamily: FONT.black, fontSize: 30, color: t.fg1 }}>
              {money(order.total, order.currency)}
            </Text>
            {delivery.sent ? (
              <Badge
                label={
                  mode === "payment_link"
                    ? "Payment link sent in chat"
                    : "Checkout link sent in chat"
                }
                tone="good"
              />
            ) : (
              <Badge label="Not delivered in chat — share the link yourself" tone="warm" />
            )}
          </View>

          {url ? (
            <Card padding={14} gap={12}>
              <Text
                selectable
                numberOfLines={3}
                style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg2 }}
              >
                {url}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <CashierButton
                    label={copied ? "Copied" : "Copy link"}
                    variant="outline"
                    compact
                    onPress={copy}
                    icon={
                      copied ? (
                        <Check size={15} color={t.success} />
                      ) : (
                        <Copy size={15} color={t.fg1} />
                      )
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CashierButton
                    label="Share"
                    variant="outline"
                    compact
                    onPress={share}
                    icon={<Share2 size={15} color={t.fg1} />}
                  />
                </View>
              </View>
            </Card>
          ) : null}
        </View>
      </ShopSheet>
    );
  }

  const options = (
    <View style={{ padding: 16, gap: 16 }}>
      {rates.length ? (
        <View style={{ gap: 8 }}>
          <SectionLabel>Delivery</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip
              label="Customer chooses"
              active={rateId === null}
              onPress={() => setRateId(null)}
            />
            {rates.map((rate) => (
              <Chip
                key={rate.id}
                label={`${rate.name} · ${money(rate.price, currency)}`}
                active={rateId === rate.id}
                onPress={() => setRateId(rate.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!inStore && store?.allowCoupons !== false ? (
        <View style={{ gap: 8 }}>
          <SectionLabel>Coupon</SectionLabel>
          <CashierInput
            value={coupon}
            onChangeText={(value) => setCoupon(value.toUpperCase())}
            placeholder="Code (optional)"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
          />
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <SectionLabel>Send</SectionLabel>
        {inStore ? null : (
          <SegmentedControl
            options={SEND_OPTIONS}
            value={sendMode}
            onChange={setSendMode}
            inset={0}
          />
        )}
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, lineHeight: 17 }}>
          {inStore
            ? `A checkout link. The customer pays on your ${store?.checkoutVia === "SHOPIFY" ? "Shopify" : "WooCommerce"} checkout, where coupons and delivery are handled.`
            : sendMode === "payment_link"
              ? "The customer pays right away by card or wallet."
              : "The customer adds their address and picks how to pay."}
        </Text>
      </View>
    </View>
  );

  return (
    <ShopSheet
      visible={visible}
      title="Create order"
      subtitle={
        itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Add products to the cart"
      }
      onClose={close}
      footer={
        <>
          <InlineError message={error} />
          {itemCount ? (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
              <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                Subtotal · tax, delivery and coupon are applied on the order
              </Text>
              <Text style={{ ...NUM, fontFamily: FONT.bold, fontSize: 16, color: t.fg1 }}>
                {money(subtotal, currency)}
              </Text>
            </View>
          ) : null}
          <CashierButton
            label={
              mode === "payment_link" ? "Create and send payment link" : "Create and send checkout"
            }
            onPress={submit}
            disabled={!itemCount}
            loading={create.isPending}
          />
        </>
      }
    >
      <ProductPicker
        mode="order"
        channel={channel}
        currency={currency}
        lines={lines}
        onQuantity={onQuantity}
        footer={options}
      />
    </ShopSheet>
  );
}

function SectionLabel({ children }: Readonly<{ children: string }>) {
  const { t } = useTheme();
  return (
    <Text
      style={{
        fontFamily: FONT.bold,
        fontSize: 11,
        letterSpacing: 0.8,
        color: t.fg4,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function Chip({
  label,
  active,
  onPress,
}: Readonly<{ label: string; active: boolean; onPress: () => void }>) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? t.brand : t.border1,
        backgroundColor: active ? t.brandSoft : t.surface,
      }}
    >
      <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: active ? t.brand : t.fg2 }}>
        {label}
      </Text>
    </Pressable>
  );
}
