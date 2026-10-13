import { useColorScheme } from "nativewind";
import { View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { Filter, Phone } from "lucide-react-native";
import { getInboxHeaderBg, getInboxRowTheme } from "@/constants/inboxDesign";
import { usePermissions } from "@/hooks/usePermissions";

const InboxButtons = ({ activeFilterCount = 0 }: { activeFilterCount?: number }) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const { can } = usePermissions();
  const actionStyle = {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {can("inbox.read") && (
        <Pressable
          onPress={() => router.push("/protected/calls" as never)}
          accessibilityRole="button"
          accessibilityLabel="Call history"
          style={actionStyle}
        >
          <Phone size={20} color={t.fg2} />
        </Pressable>
      )}
      <Pressable
        onPress={() => router.push("/protected/inbox/Filters")}
        // The design's header action: 38x38 / radius 11, 20px glyph in `--fg-2`.
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Filter size={20} color={t.fg2} />
        {activeFilterCount > 0 && (
          // Design's bell dot, carrying the count: `--danger` with a 2px
          // `--bg-surface` ring so it reads against the bar.
          <View
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 15,
              height: 15,
              paddingHorizontal: 3,
              borderRadius: 9999,
              backgroundColor: t.danger,
              borderWidth: 2,
              borderColor: getInboxHeaderBg(isDark),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 8,
                fontFamily: "Figtree_800ExtraBold",
              }}
            >
              {activeFilterCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default InboxButtons;
