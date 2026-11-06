import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { shopErrorMessage } from "@/api/shop/shop.api";
import { useOrders } from "@/api/shop/shop.query";
import type { OrderTab } from "@/api/shop/shop.type";
import ScreenHeader from "@/components/common/ScreenHeader";
import SearchField from "@/components/common/SearchField";
import {
  CenteredSpinner,
  EmptyState,
  FONT,
  InlineError,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { useDebounced } from "@/components/loyalty/cashier/useDebounced";
import { useCommerceAccess } from "@/components/shop/chatSell";
import { ORDER_TABS } from "@/components/shop/orderFormat";
import OrderRowItem from "@/components/shop/OrderRowItem";

const EMPTY: Record<OrderTab, string> = {
  needs_action: "Nothing needs you right now.",
  awaiting_payment: "No orders are waiting on payment.",
  to_pack: "Nothing to pack.",
  shipped: "No orders on the way.",
  delivered: "No delivered orders yet.",
  returns: "No returns.",
  drafts: "No open carts.",
  cancelled: "No cancelled orders.",
  all: "No orders yet. Orders placed from chat, links and your storefront show up here.",
};

export default function OrdersScreen() {
  const { t } = useTheme();
  const { canRead, isPending: accessPending } = useCommerceAccess();
  const [tab, setTab] = useState<OrderTab>("needs_action");
  const [search, setSearch] = useState("");
  const settled = useDebounced(search);
  const { data, isLoading, isError, error, refetch, isRefetching } = useOrders(
    tab,
    undefined,
    canRead,
    settled,
  );
  const counts = data?.counts;

  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/protected/(tabs)/inbox" as never);

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader
        title="Orders"
        onBack={back}
        below={
          canRead ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", paddingHorizontal: 16 }}>
                <SearchField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by order number or customer"
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              >
                {ORDER_TABS.map((option) => {
                  const active = option.value === tab;
                  const count = option.value === "all" ? undefined : counts?.[option.value];
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setTab(option.value)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        height: 32,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: active ? t.brandInk : t.surface2,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT.semibold,
                          fontSize: 13,
                          color: active ? "#FFFFFF" : t.fg2,
                        }}
                      >
                        {option.label}
                      </Text>
                      {count ? (
                        <Text
                          style={{
                            fontFamily: FONT.bold,
                            fontSize: 11,
                            color: active ? "#FFFFFF" : t.fg3,
                          }}
                        >
                          {count}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : undefined
        }
      />

      {accessPending ? (
        <CenteredSpinner />
      ) : !canRead ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            title="Orders aren't available"
            body="The shop needs a plan that includes it and a role with access."
          />
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => (
            <OrderRowItem
              order={item}
              onPress={() =>
                router.push({
                  pathname: "/protected/orders/[id]",
                  params: { id: item.id },
                } as never)
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={t.brand}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <CenteredSpinner />
            ) : isError ? (
              <View style={{ padding: 16 }}>
                <InlineError message={shopErrorMessage(error, "Could not load orders")} />
              </View>
            ) : (
              <View style={{ padding: 16 }}>
                <EmptyState title={settled.trim() ? "No orders match that search." : EMPTY[tab]} />
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          // Inside the Menu tab now: iOS draws the tab bar over the list.
          contentInsetAdjustmentBehavior="always"
        />
      )}
    </View>
  );
}
