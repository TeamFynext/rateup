import { useLoggedInUser } from "@/api/api";
import Image from "@/components/common/Image";
import ScreenHeader from "@/components/common/ScreenHeader";
import { useMoreMenuItems } from "@/components/more/moreMenu";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { roleLabelOf } from "@/hooks/usePermissions";
import { namePreview } from "@/utils/chatbox_utils";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import Tap from "@/components/common/Tap";
import { ScrollView, Text, View } from "react-native";
import { mediaUrl } from "@/utils/cdn";

/**
 * Fallback for the More tab. A tap on the tab opens the `more-menu` sheet instead (see the
 * tabs layout), so this only shows when something navigates here directly. It lists the
 * same items, from `useMoreMenuItems`.
 */
export default function MoreScreen() {
  const { colorScheme } = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");
  const { data: user } = useLoggedInUser();
  const items = useMoreMenuItems().filter((i) => i.key !== "account");
  const sections = [{ title: "More", items }];

  const go = (href: string) => router.push(href as never);

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Menu" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        // Same reason as the Account screen: iOS draws the tab bar over the content.
        contentInsetAdjustmentBehavior="always"
      >
        {/* Profile card: who is signed in, and the way into Account details. */}
        <Tap
          onPress={() => go("/protected/more/account")}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          pressedStyle={{ opacity: 0.8 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 16,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border1,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              overflow: "hidden",
              backgroundColor: t.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user?.profilePhoto ? (
              <Image
                source={{
                  uri: mediaUrl(user.profilePhoto),
                }}
                style={{ width: 52, height: 52 }}
              />
            ) : (
              <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Figtree_800ExtraBold" }}>
                {user ? namePreview(user.userName) : ""}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: t.fg1, fontSize: 17, fontFamily: "Figtree_800ExtraBold" }}
            >
              {user?.userName ?? " "}
            </Text>
            <Text numberOfLines={1} style={{ color: t.fg3, fontSize: 13, marginTop: 2 }}>
              {user
                ? `${roleLabelOf({ role: user.role, roleKey: user.roleKey })} · ${user.orgName}`
                : " "}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.fg4} />
        </Tap>

        {sections.map((section) => {
          const { items } = section;
          if (items.length === 0) return null;
          return (
            <View key={section.title} style={{ marginTop: 24 }}>
              <Text
                style={{
                  color: t.fg3,
                  fontSize: 12,
                  fontFamily: "Figtree_800ExtraBold",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginLeft: 4,
                  marginBottom: 8,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.border1,
                  overflow: "hidden",
                }}
              >
                {items.map((item, idx) => (
                  <Tap
                    key={item.key}
                    onPress={() => go(item.href)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    pressedStyle={{ backgroundColor: t.surface2 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: t.border1,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: t.brandSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={item.icon} size={20} color={t.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.fg1, fontSize: 15, fontWeight: "600" }}>
                        {item.label}
                      </Text>
                      {item.hint ? (
                        <Text
                          numberOfLines={1}
                          style={{ color: t.fg3, fontSize: 12, marginTop: 2 }}
                        >
                          {item.hint}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.fg4} />
                  </Tap>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
