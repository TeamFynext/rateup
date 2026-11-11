import { Modal, Pressable, Text, View, useColorScheme } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import type { LucideIcon } from "lucide-react-native";
import Tap from "@/components/common/Tap";
import { Colors } from "@/constants/colors";
import { FONT } from "@/components/loyalty/cashier/ui";

export type MessageAction = { key: string; label: string; icon: LucideIcon; onPress: () => void };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** A line of the message, so it is clear which one the sheet is for. */
  preview?: string;
  /** Quick reactions; omitted when this message cannot be reacted to. */
  reactions?: { emojis: string[]; current?: string; onReact: (emoji: string) => void };
  actions: MessageAction[];
  /** Delivery times of a sent message. */
  info?: { sent?: string; delivered?: string; read?: string; failed?: boolean };
};

/** What a long press on a message offers: react, copy, reply, delivery info. */
export default function MessageActionSheet({
  visible,
  onClose,
  preview,
  reactions,
  actions,
  info,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const card = isDark ? "#161E29" : "#FFFFFF";
  const border = isDark ? Colors.dark.borderLight : Colors.light.border;
  const title = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const sub = isDark ? Colors.dark.textSubtle : Colors.light.textSubtle;
  const pressed = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const chosen = isDark ? "rgba(79,195,255,0.18)" : "rgba(28,81,142,0.10)";

  const cardStyle = {
    backgroundColor: card,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 20,
  } as const;

  const infoRows = info
    ? ([
        ["Read", info.read],
        ["Delivered", info.delivered],
        ["Sent", info.sent],
      ] as const)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Animated.View
          entering={FadeInDown.duration(180)}
          style={{ margin: 12, marginBottom: insets.bottom + 12, gap: 8 }}
        >
          {reactions ? (
            <Pressable
              onPress={() => {}}
              style={{
                ...cardStyle,
                borderRadius: 999,
                flexDirection: "row",
                justifyContent: "space-around",
                paddingVertical: 6,
                paddingHorizontal: 6,
              }}
            >
              {reactions.emojis.map((emoji) => {
                const isCurrent = reactions.current === emoji;
                return (
                  <Tap
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={isCurrent ? `Remove ${emoji} reaction` : `React ${emoji}`}
                    onPress={() => reactions.onReact(emoji)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isCurrent ? chosen : "transparent",
                    }}
                    pressedStyle={{ transform: [{ scale: 1.2 }] }}
                  >
                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  </Tap>
                );
              })}
            </Pressable>
          ) : null}

          <Pressable onPress={() => {}} style={{ ...cardStyle, padding: 6 }}>
            {preview ? (
              <Text
                numberOfLines={2}
                style={{
                  fontFamily: FONT.regular,
                  fontSize: 13,
                  color: sub,
                  paddingHorizontal: 12,
                  paddingTop: 8,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: border,
                  marginBottom: 4,
                }}
              >
                {preview}
              </Text>
            ) : null}

            {actions.map(({ key, label, icon: Icon, onPress }) => (
              <Tap
                key={key}
                onPress={onPress}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 13,
                  borderRadius: 12,
                }}
                pressedStyle={{ backgroundColor: pressed }}
              >
                <Icon size={19} color={title} />
                <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: title }}>
                  {label}
                </Text>
              </Tap>
            ))}

            {info ? (
              <View
                style={{
                  marginTop: actions.length ? 4 : 0,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 6,
                  borderTopWidth: actions.length ? 1 : 0,
                  borderTopColor: border,
                }}
              >
                {info.failed ? (
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: "#ef4444" }}>
                    Failed to send
                  </Text>
                ) : (
                  infoRows.map(([label, at]) => (
                    <View
                      key={label}
                      style={{ flexDirection: "row", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: sub }}>
                        {label}
                      </Text>
                      <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: title }}>
                        {at ? dayjs(at).format("DD MMM, h:mm A") : "—"}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
