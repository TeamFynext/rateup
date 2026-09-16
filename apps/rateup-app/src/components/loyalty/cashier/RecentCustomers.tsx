import { Clock } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { hapticSelect } from "./haptics";
import { formatNumber } from "./logic/format";
import type { RecentCustomer } from "./logic/recentCustomers";
import { Badge, Card, Divider, FONT, LABEL, NUM, PressableRow, useTheme } from "./ui";

/**
 * Most counter traffic is regulars, so the fastest path is a tap, not typing — which is
 * why this is now the body of the search screen rather than a strip under it.
 */
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
        <Clock size={13} color={t.fg4} />
        <Text style={{ ...LABEL, color: t.fg4 }}>Served recently</Text>
      </View>

      <Card padding={0}>
        {recent.map((customer, index) => (
          <React.Fragment key={customer.id}>
            {index > 0 ? <Divider /> : null}
            <PressableRow
              onPress={() => {
                hapticSelect();
                onPick(customer);
              }}
              accessibilityLabel={`Serve ${customer.name}, ${formatNumber(customer.points)} ${pointsName}`}
            >
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}
                >
                  {customer.name}
                </Text>
                <Text style={{ ...NUM, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
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
            </PressableRow>
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}
