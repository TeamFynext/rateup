import { AlertCircle, CloudOff, RefreshCw, Trash2 } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatNumber } from "./logic/format";
import { pendingItems, type OutboxItem } from "./logic/outbox";
import { maskPhone } from "./logic/maskPhone";
import { relativeFromNow } from "./relativeTime";
import { Badge, CashierButton, Card, Divider, FONT, useTheme } from "./ui";

/**
 * What has not reached the server, and what staff can do about each row.
 *
 * The queue can only be sent while the app is open, so it is not enough for it to be
 * durable — it has to be *visible*, and each row has to say plainly what state it is in.
 * A silently failed award is a customer who paid and got nothing.
 */
export function OutboxSheet({
  visible,
  items,
  pointsName,
  online,
  onClose,
  onRetry,
  onDiscard,
  onSendNow,
}: Readonly<{
  visible: boolean;
  items: OutboxItem[];
  pointsName: string;
  online: boolean;
  onClose: () => void;
  onRetry: (item: OutboxItem) => void;
  onDiscard: (item: OutboxItem) => void;
  onSendNow: () => void;
}>) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const waiting = pendingItems(items);
  const failed = items.filter((item) => item.status === "failed");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: t.pageBg, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontFamily: FONT.bold, fontSize: 18, color: t.fg1 }}>Not sent yet</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.brand }}>Close</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 14 }}
        >
          {items.length === 0 ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
              Everything has reached the server.
            </Text>
          ) : null}

          {waiting.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: t.warmSoft,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <CloudOff size={16} color={t.warmStrong} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: FONT.regular,
                  fontSize: 12,
                  color: t.warmStrong,
                  lineHeight: 18,
                }}
              >
                {/* Stated plainly, because it is the one thing about this queue that is
                    surprising: it survives the app closing, but it cannot send while closed. */}
                These are saved on this phone and will not be lost. They can only be sent while the
                app is open — keep it open until they clear.
              </Text>
            </View>
          ) : null}

          {failed.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: t.status.spam.soft,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <AlertCircle size={16} color={t.status.spam.fg} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: FONT.medium,
                  fontSize: 12,
                  color: t.status.spam.fg,
                  lineHeight: 18,
                }}
              >
                {failed.length === 1
                  ? "One of these was refused by the server. The customer has not been given anything for it."
                  : `${failed.length} of these were refused by the server. Those customers have not been given anything for them.`}
              </Text>
            </View>
          ) : null}

          {items.length > 0 ? (
            <Card padding={0}>
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={{ padding: 14, gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Text
                        style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1, flex: 1 }}
                        numberOfLines={1}
                      >
                        {describe(item, pointsName)}
                      </Text>
                      <StatusBadge item={item} />
                    </View>

                    <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                      {item.context.customerName} · {maskPhone(item.context.phone)} ·{" "}
                      {relativeFromNow(new Date(item.createdAt).toISOString())}
                    </Text>

                    {item.lastError ? (
                      <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg4 }}>
                        {item.lastError}
                      </Text>
                    ) : null}

                    {item.status === "needs_review" ? (
                      <Text
                        style={{
                          fontFamily: FONT.regular,
                          fontSize: 12,
                          color: t.status.pending.fg,
                          lineHeight: 18,
                        }}
                      >
                        {/* The server applies the rules in force when the request lands and
                            stamps its own timestamp, so an old purchase would earn the wrong
                            amount on the wrong day. */}
                        Taken more than six hours ago. Sending it now would use today&apos;s earning
                        rules and today&apos;s date — check before sending.
                      </Text>
                    ) : null}

                    {item.status !== "pending" || failed.length > 0 ? (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <CashierButton
                          label="Send it"
                          variant="outline"
                          compact
                          icon={<RefreshCw size={14} color={t.fg2} />}
                          onPress={() => onRetry(item)}
                        />
                        <CashierButton
                          label="Discard"
                          variant="ghost"
                          compact
                          icon={<Trash2 size={14} color={t.danger} />}
                          onPress={() => onDiscard(item)}
                        />
                      </View>
                    ) : null}
                  </View>
                </React.Fragment>
              ))}
            </Card>
          ) : null}

          {waiting.length > 0 ? (
            <CashierButton
              label={online ? "Send now" : "Try again"}
              onPress={onSendNow}
              icon={<RefreshCw size={17} color="#FFFFFF" />}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function StatusBadge({ item }: Readonly<{ item: OutboxItem }>) {
  switch (item.status) {
    case "failed":
      return <Badge label="Refused" tone="warm" />;
    case "needs_review":
      return <Badge label="Needs checking" tone="warm" />;
    case "unresolved":
      return <Badge label="Checking" tone="neutral" />;
    default:
      return <Badge label="Waiting" tone="neutral" />;
  }
}

function describe(item: OutboxItem, pointsName: string): string {
  switch (item.kind) {
    case "award": {
      const points = item.context.estimatedPoints;
      return points === undefined ? "Purchase" : `About ${formatNumber(points)} ${pointsName}`;
    }
    case "apply_redemption":
    case "redeem_shortcode":
      return item.context.rewardName ?? "Reward marked used";
  }
}
