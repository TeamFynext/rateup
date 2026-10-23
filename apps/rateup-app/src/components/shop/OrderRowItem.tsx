import { ChevronRight } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import type { OrderRow } from "@/api/shop/shop.type";
import { Badge, FONT, NUM, useTheme } from "@/components/loyalty/cashier/ui";

import { money, orderDate, orderHeadline, orderNumber } from "./orderFormat";

export default function OrderRowItem({
  order,
  onPress,
  showCustomer = true,
}: Readonly<{ order: OrderRow; onPress: () => void; showCustomer?: boolean }>) {
  const { t } = useTheme();
  const headline = orderHeadline(order);
  const items = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customer =
    order.contact?.name ||
    order.customerName ||
    order.contact?.whatsappUserName ||
    order.customerPhone;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${orderNumber(order)}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.rowDivider,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ ...NUM, fontFamily: FONT.bold, fontSize: 14, color: t.fg1 }}>
            {orderNumber(order)}
          </Text>
          {showCustomer && customer ? (
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontFamily: FONT.medium, fontSize: 14, color: t.fg2 }}
            >
              {customer}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Text style={{ ...NUM, fontFamily: FONT.bold, fontSize: 14, color: t.fg1 }}>
            {money(order.total, order.currency)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Badge label={headline.label} tone={headline.tone} />
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}
          >
            {order.nextStep || `${items} item${items === 1 ? "" : "s"}`}
          </Text>
        </View>
        <Text style={{ fontFamily: FONT.regular, fontSize: 11, color: t.fg4 }}>
          {`${items} item${items === 1 ? "" : "s"} · ${orderDate(order.placedAt ?? order.createdAt)}`}
        </Text>
      </View>
      <ChevronRight size={18} color={t.fg4} />
    </Pressable>
  );
}
