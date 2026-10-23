import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { MessageCircle, Package } from "lucide-react-native";
import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { shopErrorMessage } from "@/api/shop/shop.api";
import { useOrder, useOrderActions } from "@/api/shop/shop.query";
import type { OrderDetail, PaymentLinkResult, ShippingAddress } from "@/api/shop/shop.type";
import Image from "@/components/common/Image";
import ScreenHeader from "@/components/common/ScreenHeader";
import {
  Badge,
  Card,
  CashierButton,
  CashierInput,
  CenteredSpinner,
  Divider,
  EmptyState,
  Field,
  FONT,
  InlineError,
  NUM,
  ReceiptRow,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { useCommerceAccess } from "@/components/shop/chatSell";
import {
  fulfillmentBadge,
  money,
  orderDate,
  orderNumber,
  paymentBadge,
} from "@/components/shop/orderFormat";
import ShopSheet from "@/components/shop/ShopSheet";

function addressLines(address: ShippingAddress | null): string[] {
  if (!address) return [];
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(", ");
  return [
    address.name,
    address.line1,
    address.line2,
    cityLine,
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line));
}

const UNPAID = new Set(["UNPAID", "PENDING", "FAILED", "EXPIRED", "COD_PENDING"]);

export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const { t } = useTheme();
  const { canRead, isPending: accessPending } = useCommerceAccess();
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useOrder(canRead ? id : "");

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/protected/orders" as never);

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title={order ? `Order ${orderNumber(order)}` : "Order"} onBack={back} />
      {isLoading || accessPending ? (
        <CenteredSpinner />
      ) : !order ? (
        <View style={{ padding: 16 }}>
          {isError ? (
            <InlineError message={shopErrorMessage(error, "Could not load this order")} />
          ) : (
            <EmptyState title="Order not found" />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.brand} />
          }
        >
          <Summary order={order} />
          <Actions order={order} />
          <Customer order={order} />
          <Items order={order} />
          <Timeline order={order} />
        </ScrollView>
      )}
    </View>
  );
}

function SectionTitle({ children }: Readonly<{ children: string }>) {
  const { t } = useTheme();
  return (
    <Text
      style={{
        fontFamily: FONT.bold,
        fontSize: 11,
        letterSpacing: 0.8,
        color: t.fg4,
        textTransform: "uppercase",
        marginBottom: -6,
        marginLeft: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Summary({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTheme();
  const payment = paymentBadge(order.paymentStatus);
  const fulfillment = fulfillmentBadge(order.fulfillmentStatus);
  return (
    <Card gap={10}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {order.status === "CANCELLED" ? <Badge label="Cancelled" /> : null}
        {order.status === "DRAFT" ? <Badge label="Open cart" tone="warm" /> : null}
        <Badge label={payment.label} tone={payment.tone} />
        <Badge label={fulfillment.label} tone={fulfillment.tone} />
      </View>
      <Text style={{ ...NUM, fontFamily: FONT.black, fontSize: 28, color: t.fg1 }}>
        {money(order.total, order.currency)}
      </Text>
      {order.nextStep ? (
        <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg2 }}>
          {order.nextStep}
        </Text>
      ) : null}
      <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
        {orderDate(order.placedAt ?? order.createdAt)}
        {order.cancelReason ? ` · Cancelled: ${order.cancelReason}` : ""}
      </Text>
    </Card>
  );
}

function Actions({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTheme();
  const { canSell, canManageOrders } = useCommerceAccess();
  const actions = useOrderActions(order.id);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<PaymentLinkResult | null>(null);
  const [sheet, setSheet] = useState<"ship" | "cancel" | null>(null);

  const live = order.status !== "CANCELLED" && order.status !== "COMPLETED";
  const unpaid = UNPAID.has(order.paymentStatus);
  const f = order.fulfillmentStatus;
  // Paid and fulfilled in the shop's Shopify or WooCommerce store; RateUp follows it there.
  const inStore = order.checkoutVia !== "RATEUP";
  const here = canManageOrders && !inStore;

  const can = {
    paymentLink:
      canSell &&
      live &&
      unpaid &&
      order.paymentStatus !== "COD_PENDING" &&
      (!inStore || order.status === "DRAFT"),
    confirmCod:
      canManageOrders && live && order.paymentStatus === "COD_PENDING" && !order.confirmedAt,
    markPaid: here && live && unpaid,
    pack: here && order.status === "OPEN" && f === "UNFULFILLED",
    ship: here && order.status === "OPEN" && (f === "UNFULFILLED" || f === "PACKED"),
    deliver: here && live && (f === "SHIPPED" || f === "OUT_FOR_DELIVERY"),
    cancel: canManageOrders && live && f !== "DELIVERED" && (!inStore || order.status === "DRAFT"),
  };
  // The API records "cod" against cash-on-delivery orders so reports keep them apart.
  const cod = order.paymentStatus === "COD_PENDING" || order.paymentMethod === "cod";
  const storeName = order.checkoutVia === "WOOCOMMERCE" ? "WooCommerce" : "Shopify";
  if (!Object.values(can).some(Boolean))
    return inStore && live ? (
      <Card gap={6}>
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg2, lineHeight: 18 }}>
          {`Placed in ${storeName}. Fulfil, cancel and refund it there; this order follows along.`}
        </Text>
      </Card>
    ) : null;

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(shopErrorMessage(e, fallback));
    }
  };

  return (
    <Card gap={10}>
      <InlineError message={error} />
      {link ? (
        <View style={{ gap: 6 }}>
          <Badge
            label={
              link.delivered
                ? inStore
                  ? "Checkout link sent in chat"
                  : "Payment link sent in chat"
                : "Link created, not delivered in chat"
            }
            tone={link.delivered ? "good" : "warm"}
          />
          {link.deliveryError ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
              {link.deliveryError}
            </Text>
          ) : null}
          <Text
            selectable
            numberOfLines={2}
            style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg2 }}
          >
            {link.url}
          </Text>
          <CashierButton
            label="Copy link"
            variant="outline"
            compact
            onPress={() => {
              Clipboard.setStringAsync(link.url).catch(() => undefined);
            }}
          />
        </View>
      ) : null}
      {can.confirmCod ? (
        <CashierButton
          label="Confirm cash on delivery"
          loading={actions.confirmCod.isPending}
          onPress={() => run(() => actions.confirmCod.mutateAsync(), "Could not confirm the order")}
        />
      ) : null}
      {can.pack ? (
        <CashierButton
          label="Mark packed"
          variant={can.confirmCod ? "outline" : "primary"}
          loading={actions.fulfillment.isPending && actions.fulfillment.variables === "PACKED"}
          onPress={() =>
            run(() => actions.fulfillment.mutateAsync("PACKED"), "Could not update the order")
          }
        />
      ) : null}
      {can.ship ? (
        <CashierButton label="Mark shipped" variant="outline" onPress={() => setSheet("ship")} />
      ) : null}
      {can.deliver ? (
        <CashierButton
          label="Mark delivered"
          loading={actions.fulfillment.isPending && actions.fulfillment.variables === "DELIVERED"}
          onPress={() =>
            run(() => actions.fulfillment.mutateAsync("DELIVERED"), "Could not update the order")
          }
        />
      ) : null}
      {can.paymentLink ? (
        <CashierButton
          label={
            inStore
              ? "Resend checkout link"
              : link
                ? "Send payment link again"
                : "Send payment link"
          }
          variant="outline"
          loading={actions.paymentLink.isPending}
          onPress={() =>
            run(
              async () => setLink(await actions.paymentLink.mutateAsync()),
              "Could not create a payment link",
            )
          }
        />
      ) : null}
      {can.markPaid ? (
        <CashierButton
          label="Mark paid in cash"
          variant="outline"
          loading={actions.markPaid.isPending}
          onPress={() =>
            run(
              () => actions.markPaid.mutateAsync(cod ? "cod" : "cash"),
              "Could not mark the order paid",
            )
          }
        />
      ) : null}
      {can.cancel ? (
        <CashierButton label="Cancel order" variant="ghost" onPress={() => setSheet("cancel")} />
      ) : null}

      <ShipSheet visible={sheet === "ship"} onClose={() => setSheet(null)} order={order} />
      <CancelSheet visible={sheet === "cancel"} onClose={() => setSheet(null)} order={order} />
    </Card>
  );
}

function ShipSheet({
  visible,
  onClose,
  order,
}: Readonly<{ visible: boolean; onClose: () => void; order: OrderDetail }>) {
  const { ship } = useOrderActions(order.id);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };
  const submit = async () => {
    setError(null);
    try {
      await ship.mutateAsync({
        carrier: carrier.trim() || null,
        trackingNumber: tracking.trim() || null,
      });
      setCarrier("");
      setTracking("");
      onClose();
    } catch (e) {
      setError(shopErrorMessage(e, "Could not mark the order shipped"));
    }
  };

  return (
    <ShopSheet
      visible={visible}
      title="Mark shipped"
      subtitle={`Order ${orderNumber(order)} · the customer gets a message`}
      onClose={close}
      footer={
        <>
          <InlineError message={error} />
          <CashierButton label="Mark shipped" onPress={submit} loading={ship.isPending} />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Carrier" hint="Optional">
          <CashierInput
            value={carrier}
            onChangeText={setCarrier}
            placeholder="e.g. Courier name"
            maxLength={60}
          />
        </Field>
        <Field label="Tracking number" hint="Optional">
          <CashierInput
            value={tracking}
            onChangeText={setTracking}
            placeholder="Tracking number"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={80}
          />
        </Field>
      </ScrollView>
    </ShopSheet>
  );
}

function CancelSheet({
  visible,
  onClose,
  order,
}: Readonly<{ visible: boolean; onClose: () => void; order: OrderDetail }>) {
  const { cancel } = useOrderActions(order.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };
  const submit = async () => {
    setError(null);
    try {
      await cancel.mutateAsync(reason.trim());
      setReason("");
      onClose();
    } catch (e) {
      setError(shopErrorMessage(e, "Could not cancel the order"));
    }
  };

  return (
    <ShopSheet
      visible={visible}
      title="Cancel order"
      subtitle={`Order ${orderNumber(order)} · stock is returned and the customer is told`}
      onClose={close}
      footer={
        <>
          <InlineError message={error} />
          <CashierButton
            label="Cancel order"
            variant="danger"
            onPress={submit}
            disabled={!reason.trim()}
            loading={cancel.isPending}
          />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Reason">
          <CashierInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Customer changed their mind"
            maxLength={200}
            autoFocus
          />
        </Field>
      </ScrollView>
    </ShopSheet>
  );
}

function Customer({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTheme();
  const name = order.contact?.name || order.customerName || "Customer";
  const phone = order.contact?.phone || order.customerPhone;
  const email = order.contact?.email || order.customerEmail;
  const address = addressLines(order.shippingAddress);
  const contactId = order.contact?.id ?? order.contactId;

  return (
    <>
      <SectionTitle>Customer</SectionTitle>
      <Card gap={8}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}>{name}</Text>
        {[phone, email].filter(Boolean).map((line) => (
          <Text
            key={line}
            selectable
            style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg2 }}
          >
            {line}
          </Text>
        ))}
        {order.customerStats ? (
          <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
            {`${order.customerStats.orders} order${order.customerStats.orders === 1 ? "" : "s"} · ${money(order.customerStats.spent, order.currency)} spent`}
          </Text>
        ) : null}
        {address.length ? (
          <>
            <Divider />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.fg3 }}>Ship to</Text>
            <Text
              selectable
              style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg1, lineHeight: 19 }}
            >
              {address.join("\n")}
            </Text>
          </>
        ) : null}
        {order.shipments.map((shipment, index) => (
          <Text
            key={index}
            selectable
            style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg2 }}
          >
            {[shipment.carrier, shipment.trackingNumber].filter(Boolean).join(" · ") || "Shipped"}
          </Text>
        ))}
        {order.note ? (
          <Text
            style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}
          >{`Note: ${order.note}`}</Text>
        ) : null}
        {contactId ? (
          <CashierButton
            label="Open chat"
            variant="outline"
            compact
            icon={<MessageCircle size={15} color={t.fg1} />}
            onPress={() =>
              router.push({ pathname: "/protected/chat/[id]", params: { id: contactId } } as never)
            }
          />
        ) : null}
      </Card>
    </>
  );
}

function Items({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTheme();
  const c = order.currency;
  const discount = Number(order.discountTotal);
  const points = Number(order.pointsDiscount);
  return (
    <>
      <SectionTitle>Items</SectionTitle>
      <Card padding={0}>
        {order.items.map((item) => (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: t.rowDivider,
            }}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                contentFit="cover"
                style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: t.surface2 }}
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: t.surface2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Package size={17} color={t.fg4} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}
              >
                {[
                  item.variantTitle && item.variantTitle !== "Default" ? item.variantTitle : null,
                  `${item.quantity} × ${money(item.unitPrice, c)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            <Text style={{ ...NUM, fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
              {money(item.lineTotal, c)}
            </Text>
          </View>
        ))}
        <ReceiptRow label="Subtotal" value={money(order.subtotal, c)} />
        {discount > 0 ? (
          <ReceiptRow
            label={order.discountCode ? `Discount (${order.discountCode})` : "Discount"}
            value={`−${money(discount, c)}`}
          />
        ) : null}
        {points > 0 ? <ReceiptRow label="Points" value={`−${money(points, c)}`} /> : null}
        {Number(order.shippingTotal) > 0 || order.shippingRate ? (
          <ReceiptRow
            label={order.shippingRate?.name ? `Delivery (${order.shippingRate.name})` : "Delivery"}
            value={money(order.shippingTotal, c)}
          />
        ) : null}
        {Number(order.taxTotal) > 0 ? (
          <ReceiptRow label="Tax" value={money(order.taxTotal, c)} />
        ) : null}
        <Divider />
        <ReceiptRow label="Total" value={money(order.total, c)} strong />
      </Card>
    </>
  );
}

function Timeline({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTheme();
  if (!order.events.length) return null;
  return (
    <>
      <SectionTitle>Timeline</SectionTitle>
      <Card gap={0} padding={14}>
        {order.events.map((event, index) => (
          <View key={`${event.createdAt}-${index}`} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ alignItems: "center", width: 10 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  marginTop: 5,
                  backgroundColor: index === 0 ? t.brand : t.border1,
                }}
              />
              {index < order.events.length - 1 ? (
                <View style={{ flex: 1, width: 1, backgroundColor: t.border1, marginTop: 3 }} />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: index < order.events.length - 1 ? 14 : 0 }}>
              <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg1 }}>
                {event.message}
              </Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg4, marginTop: 2 }}>
                {orderDate(event.createdAt)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}
