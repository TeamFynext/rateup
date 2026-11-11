import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import {
  ChevronRight,
  FileText,
  ReceiptText,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react-native";
import Tap from "@/components/common/Tap";
import { Colors } from "@/constants/colors";
import { FONT } from "@/components/loyalty/cashier/ui";

type Action = {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tint: string;
  onPress: () => void;
};

type Props = {
  isDark: boolean;
  /** WhatsApp only: templates are a WhatsApp feature. */
  onTemplate?: () => void;
  /** Products and orders only show when the chat's channel can sell. */
  onProducts?: () => void;
  onOrder?: () => void;
};

/** The popover above the composer's plus button. */
export default function ComposerActionMenu({ isDark, onTemplate, onProducts, onOrder }: Props) {
  const actions: Action[] = [];
  if (onTemplate)
    actions.push({
      key: "template",
      label: "Send template",
      hint: "Approved WhatsApp message",
      icon: FileText,
      tint: Colors.accent.cyan,
      onPress: onTemplate,
    });
  if (onProducts)
    actions.push({
      key: "products",
      label: "Send products",
      hint: "Share items from your catalog",
      icon: ShoppingBag,
      tint: Colors.accent.whatsapp,
      onPress: onProducts,
    });
  if (onOrder)
    actions.push({
      key: "order",
      label: "Create order",
      hint: "Build an order for this customer",
      icon: ReceiptText,
      tint: Colors.accent.orange,
      onPress: onOrder,
    });

  const card = isDark ? "#161E29" : "#FFFFFF";
  const border = isDark ? Colors.dark.borderLight : Colors.light.border;
  const title = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const sub = isDark ? Colors.dark.textSubtle : Colors.light.textSubtle;
  const pressed = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(120)}
      style={{
        position: "absolute",
        bottom: 56,
        left: 14,
        width: 264,
        zIndex: 50,
        borderRadius: 18,
        padding: 6,
        backgroundColor: card,
        borderWidth: 1,
        borderColor: border,
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.45 : 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      }}
    >
      <Text
        style={{
          fontFamily: FONT.semibold,
          fontSize: 11,
          letterSpacing: 0.6,
          color: sub,
          paddingHorizontal: 10,
          paddingTop: 6,
          paddingBottom: 4,
        }}
      >
        QUICK ACTIONS
      </Text>
      {actions.map(({ key, label, hint, icon: Icon, tint, onPress }) => (
        <Tap
          key={key}
          onPress={onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 8,
            paddingVertical: 9,
            borderRadius: 12,
          }}
          pressedStyle={{ backgroundColor: pressed }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${tint}22`,
            }}
          >
            <Icon size={18} color={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: title }}>{label}</Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: FONT.regular, fontSize: 12, color: sub, marginTop: 1 }}
            >
              {hint}
            </Text>
          </View>
          <ChevronRight size={16} color={sub} />
        </Tap>
      ))}
    </Animated.View>
  );
}
