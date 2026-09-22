import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/constants/colors";
import { namePreview } from "@/utils/chatbox_utils";

import type { MentionUser } from "./useMention";

/**
 * The teammate picker for `@` in a private note. It sits in the composer's
 * normal flow rather than floating over it: an absolutely positioned popup that
 * overflows its parent gets clipped on Android, and the footer already grows
 * upward from the bottom of the screen.
 */
export default function MentionList({
  users,
  onSelect,
  isDark,
}: {
  users: MentionUser[];
  onSelect: (user: MentionUser) => void;
  isDark: boolean;
}) {
  const surface = isDark ? Colors.dark.surface : Colors.light.card;
  const border = isDark ? Colors.dark.borderLight : Colors.light.border;
  const muted = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  if (!users.length) {
    return (
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          backgroundColor: surface,
          borderColor: border,
        }}
      >
        <Text style={{ fontSize: 12, fontFamily: "InstrumentSans_400Regular", color: muted }}>
          No teammates found
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        backgroundColor: surface,
        borderColor: border,
      }}
    >
      <ScrollView
        // Without this the input blurs on the first tap and the pick is lost.
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 180 }}
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {users.map((user) => (
          <TouchableOpacity
            key={user.id}
            onPress={() => onSelect(user)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: Colors.accent.orange,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: "InstrumentSans_700Bold", color: "#fff" }}>
                {namePreview(user.name)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: "InstrumentSans_600SemiBold",
                color: isDark ? Colors.dark.textPrimary : Colors.light.textPrimary,
              }}
            >
              {user.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
