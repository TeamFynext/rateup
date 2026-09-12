import { Clock } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { hapticSelect } from "./haptics";
import { formatNumber } from "./logic/format";
import type { RecentCustomer } from "./logic/recentCustomers";
import { Badge, Card, Divider, FONT, useTheme } from "./ui";

/** Most counter traffic is regulars, so the fastest path is a tap, not typing. */
export function RecentCustomers({
  recent,
  pointsName,
  onPick,
  pendingFor,
}: Readonly<{
  recent: RecentCustomer[];
  pointsName: string;
  onPick: (customer: RecentCustomer) => void;
  /**
   * Points taken for this customer that have not reached the server yet.
   *
   * Shown next to the balance, never folded into it: `points` is the last figure the
   * server gave, and it is what the next member of staff reads out.
   */
  pendingFor?: (customer: RecentCustomer) => number;
}>) {
  const { t } = useTheme();
  if (recent.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Clock size={14} color={t.fg3} />
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.fg3 }}>Recent</Text>
      </View>

      <Card padding={0}>
        {recent.map((customer, index) => (
          <React.Fragment key={customer.id}>
            {index > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => {
                hapticSelect();
                onPick(customer);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: pressed ? t.surface2 : "transparent",
              })}
            >
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
                >
                  {customer.name}
                </Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                  {customer.tierName ? `${customer.tierName} · ` : ""}
                  {formatNumber(customer.points)} {pointsName}
                  {(pendingFor?.(customer) ?? 0) > 0
                    ? ` · +${formatNumber(pendingFor?.(customer) ?? 0)} waiting`
                    : ""}
                </Text>
              </View>
              {customer.pendingCount > 0 ? (
                <Badge label={`${customer.pendingCount} waiting`} tone="warm" />
              ) : null}
            </Pressable>
          </React.Fragment>
        ))}
      </Card>

      <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
        Tap a name to serve them again.
      </Text>
    </View>
  );
}
