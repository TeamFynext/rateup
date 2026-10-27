import { useLoggedInUser } from "@/api/api";
import Image from "@/components/common/Image";
import Tap from "@/components/common/Tap";
import { useMoreMenuItems } from "@/components/more/moreMenu";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { roleLabelOf } from "@/hooks/usePermissions";
import { namePreview } from "@/utils/chatbox_utils";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isIOS = Platform.OS === "ios";
const SIDE_PADDING = 20;
/** The narrowest a grid cell may get before a column is dropped. */
const MIN_CELL = 84;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 6;
const MAX_TILE = 64;

/** `#RRGGBB` at the given alpha, for the faded tile behind each icon. */
const fade = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

/**
 * The More tab's menu, shown as a native sheet (`presentation: "formSheet"` in the
 * protected layout): UISheetPresentationController on iOS, a Material bottom sheet on
 * Android. A profile row on top, then every other feature as a tile.
 *
 * Nothing is sized for one phone: the grid measures its own width and fits as many
 * columns as keep each cell at least `MIN_CELL` wide, so a small phone gets 3–4, a large
 * one or a tablet more, and the tile scales with its cell. The sheet takes its height
 * from the content (`fitToContents`), so there is no `flex: 1` here.
 */
export default function MoreMenuSheet() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { data: user } = useLoggedInUser();
  const all = useMoreMenuItems();
  const account = all.find((i) => i.key === "account");
  const tiles = all.filter((i) => i.key !== "account");

  // Starts from the window (right on a phone, where the sheet is full width) and is
  // corrected by `onLayout` where it is not, such as an iPad's narrower sheet.
  const [gridWidth, setGridWidth] = useState(windowWidth - SIDE_PADDING * 2);
  const columns = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor(gridWidth / MIN_CELL)));
  const cell = gridWidth / columns;
  const tile = Math.min(MAX_TILE, Math.round(cell * 0.72));

  // `replace`, not `push`: the sheet gives way to the screen, so Back from that screen
  // lands on the tab the user started from rather than reopening the sheet.
  const open = (href: string) => router.replace(href as never);

  const softFill = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View
      style={{
        // iOS 26 draws the sheet itself in Liquid Glass, and only shows through a clear
        // background; earlier iOS falls back to the system sheet colour. Android's
        // Material sheet has no material of its own, so it gets the surface colour.
        backgroundColor: isIOS ? "transparent" : t.surface,
        paddingTop: isIOS ? 28 : 20,
        paddingHorizontal: SIDE_PADDING,
        paddingBottom: Math.max(insets.bottom, 16) + 12,
      }}
    >
      {/* Android's sheet draws no handle of its own; iOS gets the system grabber. */}
      {!isIOS && <View style={[styles.handle, { backgroundColor: t.fg4 }]} />}

      {account ? (
        <Tap
          onPress={() => open(account.href)}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={[styles.profileRow, { backgroundColor: softFill }]}
          pressedStyle={{ opacity: 0.6 }}
        >
          <View style={[styles.avatar, { backgroundColor: t.brandInk }]}>
            {user?.profilePhoto ? (
              <Image
                source={{
                  uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${user.profilePhoto}`,
                }}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Text style={styles.avatarText}>{user ? namePreview(user.userName) : ""}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[styles.name, { color: t.fg1 }]}>
              {user?.userName ?? "Account"}
            </Text>
            <Text numberOfLines={1} style={[styles.meta, { color: t.fg3 }]}>
              {user
                ? `${roleLabelOf({ role: user.role, roleKey: user.roleKey })} · ${user.orgName}`
                : "Profile and settings"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.fg4} />
        </Tap>
      ) : null}

      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - gridWidth) > 1) setGridWidth(w);
        }}
        style={styles.grid}
      >
        {tiles.map((item) => (
          <Tap
            key={item.key}
            onPress={() => open(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{ width: cell, alignItems: "center", paddingHorizontal: 4 }}
            pressedStyle={{ opacity: 0.7, transform: [{ scale: 0.94 }] }}
          >
            <View
              style={{
                width: tile,
                height: tile,
                borderRadius: Math.round(tile * 0.3),
                backgroundColor: fade(item.tint, isDark ? 0.22 : 0.14),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={item.icon} size={Math.round(tile * 0.42)} color={item.tint} />
            </View>
            <Text numberOfLines={1} style={[styles.tileLabel, { color: t.fg1 }]}>
              {item.label}
            </Text>
          </Tap>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 17, fontFamily: "Figtree_800ExtraBold" },
  name: { fontSize: 16, fontFamily: "Figtree_800ExtraBold" },
  meta: { fontSize: 13, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 20, rowGap: 18 },
  tileLabel: { fontSize: 12, fontWeight: "600", marginTop: 8, textAlign: "center" },
});
