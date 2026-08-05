import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useColorScheme } from "nativewind";
import { ArrowLeft, Search, SearchX } from "lucide-react-native";
import { getInboxHeaderBg, getInboxRowTheme } from "@/constants/inboxDesign";

type InboxSearchViewProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  /** Results for the current query; only rendered once something is typed. */
  children: React.ReactNode;
};

/**
 * The design's search screen (`RateUp Mobile Inbox.dc.html`, the `viewSearch`
 * block): a back arrow beside a 40px filled field, over a full-bleed page.
 */
export default function InboxSearchView({
  query,
  onQueryChange,
  onClose,
  children,
}: Readonly<InboxSearchViewProps>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const headerBg = getInboxHeaderBg(isDark);
  const isIdle = query.trim().length === 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#091522" : "#FAFAF7",
      }}
    >
      {/* Search bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 14,
          backgroundColor: headerBg,
          borderBottomWidth: 1,
          borderBottomColor: t.border1,
        }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={6}
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={21} color={t.fg1} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: 40,
            paddingHorizontal: 12,
            borderRadius: 11,
            backgroundColor: t.surface2,
          }}
        >
          <Search size={17} color={t.fg4} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search people, tickets, messages"
            placeholderTextColor={t.fg4}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={{
              flex: 1,
              fontSize: 14,
              fontFamily: "Nunito_400Regular",
              color: t.fg1,
              padding: 0,
            }}
          />
        </View>
      </View>

      {/* Results */}
      <View style={{ flex: 1 }}>
        {isIdle ? (
          <Text
            style={{
              paddingVertical: 24,
              paddingHorizontal: 20,
              fontSize: 13,
              fontFamily: "Nunito_400Regular",
              color: t.fg4,
            }}
          >
            Start typing to search across every conversation, ticket code and
            customer.
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** The design's `searchEmpty` state, for lists to use as their empty component. */
export function InboxSearchEmpty() {
  const { colorScheme } = useColorScheme();
  const t = getInboxRowTheme(colorScheme === "dark");

  return (
    <View
      style={{
        paddingVertical: 60,
        paddingHorizontal: 24,
        alignItems: "center",
      }}
    >
      <SearchX size={28} color={t.fg4} />
      <Text
        style={{
          marginTop: 8,
          fontSize: 13,
          fontFamily: "Nunito_400Regular",
          color: t.fg4,
        }}
      >
        No matches found.
      </Text>
    </View>
  );
}
