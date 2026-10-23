import { router } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useOrders } from "@/api/shop/shop.query";
import type { OrderRow } from "@/api/shop/shop.type";
import { Badge, FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";

import { money, orderDate, orderHeadline, orderNumber } from "./orderFormat";

/** Open carts first, then the latest orders, for the contact info screen. */
export default function ContactOrders({ contactId }: Readonly<{ contactId: string }>) {
  const { t } = useTheme();
  const carts = useOrders("drafts", contactId);
  const orders = useOrders("all", contactId);
  const rows = [...(carts.data?.items ?? []), ...(orders.data?.items ?? [])];

  if (carts.isLoading || orders.isLoading) {
    return (
      <View style={{ paddingVertical: 14 }}>
        <ActivityIndicator color={t.brand} />
      </View>
    );
  }
  if (!rows.length) {
    return (
      <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, paddingVertical: 12 }}>
        No orders or carts yet.
      </Text>
    );
  }

  return (
    <View>
      {rows.map((order, index) => (
        <Row key={order.id} order={order} last={index === rows.length - 1} />
      ))}
    </View>
  );
}

function Row({ order, last }: Readonly<{ order: OrderRow; last: boolean }>) {
  const { t } = useTheme();
  const headline = orderHeadline(order);
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/protected/orders/[id]", params: { id: order.id } } as never)
      }
      accessibilityRole="button"
      accessibilityLabel={`Order ${orderNumber(order)}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.rowDivider,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
          {`${orderNumber(order)} · ${orderDate(order.placedAt ?? order.createdAt)}`}
        </Text>
        <Badge label={headline.label} tone={headline.tone} />
      </View>
      <Text style={{ ...NUM, fontFamily: FONT.bold, fontSize: 14, color: t.fg1 }}>
        {money(order.total, order.currency)}
      </Text>
    </Pressable>
  );
}
