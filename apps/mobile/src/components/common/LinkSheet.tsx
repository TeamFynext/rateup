import { Linking, Modal, Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExternalLink, Link2 } from "lucide-react-native";
import Tap from "@/components/common/Tap";
import { Colors } from "@/constants/colors";
import { Toast } from "@/components/common/Notice";
import { FONT } from "@/components/loyalty/cashier/ui";
import { logger } from "@/utils/logger";

/** Bottom sheet shown when a link in a message is tapped: the URL and one "Open link" action. */
export default function LinkSheet({ url, onClose }: { url: string | null; onClose: () => void }) {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();

  const card = isDark ? "#161E29" : "#FFFFFF";
  const border = isDark ? Colors.dark.borderLight : Colors.light.border;
  const title = isDark ? Colors.dark.textPrimary : Colors.light.textPrimary;
  const sub = isDark ? Colors.dark.textSubtle : Colors.light.textSubtle;
  const pressed = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  const open = async () => {
    if (!url) return;
    onClose();
    try {
      await Linking.openURL(url);
    } catch (err) {
      logger.warn("Could not open link", err);
      Toast.error("Couldn't open this link");
    }
  };

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        {/* Swallow taps on the card so only the backdrop closes it. */}
        <Pressable
          onPress={() => {}}
          style={{
            margin: 12,
            marginBottom: insets.bottom + 12,
            borderRadius: 20,
            padding: 8,
            backgroundColor: card,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 10,
              paddingTop: 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: border,
            }}
          >
            <Link2 size={16} color={sub} />
            <Text
              numberOfLines={2}
              style={{ flex: 1, fontFamily: FONT.regular, fontSize: 13, color: sub }}
            >
              {url}
            </Text>
          </View>
          <Tap
            onPress={open}
            accessibilityRole="button"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 10,
              paddingVertical: 14,
              marginTop: 4,
              borderRadius: 12,
            }}
            pressedStyle={{ backgroundColor: pressed }}
          >
            <ExternalLink size={18} color={Colors.accent.cyan} />
            <Text style={{ fontFamily: FONT.semibold, fontSize: 15, color: title }}>Open link</Text>
          </Tap>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
