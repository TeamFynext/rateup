import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Pressable,
  ScrollView,
} from "react-native";
import { useContactCounts } from "@/api/inbox/contacts/contacts.query";
import InboxButtons from "@/components/inbox/InboxButtons";
import { useChatFilterStore, useSelectedTabStore } from "@/utils/store";
import Inbox from "@/components/inbox/inbox";
import RefreshButton from "@/components/inbox/RefreshButton";
import InboxSearchView from "@/components/inbox/InboxSearchView";
import ScreenHeader, {
  HeaderIconButton,
} from "@/components/common/ScreenHeader";
import { getInboxRowTheme } from "@/constants/inboxDesign";
import { Search } from "lucide-react-native";
import { useInboxCountStore } from "@/store/inboxCountStore";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

/**
 * The design's inbox segment (`RateUp Mobile Inbox.dc.html`, the `segments`
 * strip): a 32px pill, 13px/600 label, and a rounded count badge. Geometry and
 * the active treatment are the design's verbatim; the inactive/dark colours use
 * this app's existing palette so the strip doesn't clash with the navy chrome.
 */
function SegmentPill({
  label,
  count,
  focused,
  onPress,
}: Readonly<{
  label: string;
  count?: number;
  focused: boolean;
  onPress: () => void;
}>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const background = focused
    ? Colors.brand.blue
    : isDark
      ? "transparent"
      : Colors.light.card;
  const borderColor = focused
    ? Colors.brand.blue
    : isDark
      ? Colors.dark.pillBorder
      : Colors.light.border;
  const labelColor = focused
    ? "#fff"
    : isDark
      ? Colors.dark.pillText
      : Colors.light.pillText;
  const countBg = focused
    ? "rgba(255,255,255,0.22)"
    : isDark
      ? Colors.dark.statusBg
      : Colors.light.surface;
  const countFg = focused
    ? "#fff"
    : isDark
      ? Colors.dark.textMuted
      : Colors.light.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 32,
        paddingHorizontal: 13,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor,
        backgroundColor: background,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: "Nunito_600SemiBold",
          color: labelColor,
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          style={{
            minWidth: 18,
            paddingHorizontal: 5,
            paddingVertical: 1,
            borderRadius: 9999,
            backgroundColor: countBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Nunito_700Bold",
              color: countFg,
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function InboxLayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { selectedTab, setSelectedTab } = useSelectedTabStore();
  const activeTab = selectedTab as "Open" | "Closed" | "All" | "Mine" | "New" | "Favourites";
  const setActiveTab = (tab: "Open" | "Closed" | "All" | "Mine" | "New" | "Favourites") => setSelectedTab(tab);

  const { userId } = useAuth();
  const setFilter = useChatFilterStore((state) => state.setFilter);
  const filterFromStore = useChatFilterStore((state) => state.filter);
  const isMine = !!(
    userId &&
    filterFromStore.assignedUserIds &&
    filterFromStore.assignedUserIds.includes(userId)
  );

  const renderInboxContent = () => {
    switch (activeTab) {
      case "Open":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus={undefined}
            searchTerm={searchTerm}
            statusOverride={
              filterFromStore.status && filterFromStore.status.length > 0
                ? filterFromStore.status
                : ["ASSIGNED", "UNASSIGNED"]
            }
          />
        );

      case "Closed":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus="Addressed"
            searchTerm={searchTerm}
          />
        );

      case "All":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus={null}
            searchTerm={searchTerm}
          />
        );

      case "Mine":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus="mine"
            searchTerm={searchTerm}
          />
        );

      case "New":
        return (
          <Inbox
            messageType="usermessages"
            waMessageAssignStatus="New"
            searchTerm={searchTerm}
          />
        );

      case "Favourites":
        return (
          <Inbox
            messageType="all"
            waMessageAssignStatus={null}
            searchTerm={searchTerm}
            favorite={true}
          />
        );

      default:
        return null;
    }
  };

  const { data: contactCountsData, isLoading: isContactCountsLoading } =
    useContactCounts();
  const setCounts = useInboxCountStore((state) => state.setCounts);
  const contactCounts = useInboxCountStore((state) => state.counts);

  useEffect(() => {
    if (contactCountsData) {
      setCounts({
        openCount:
          (contactCountsData.assigned || 0) +
          (contactCountsData.unassigned || 0),
        closedCount: contactCountsData.closed || 0,
        allCount: contactCountsData.total || contactCountsData.all || 0,
        newCount: contactCountsData.new || 0,
      });
    }
  }, [contactCountsData, setCounts]);

  const activeFilterCount =
    (filterFromStore.status && filterFromStore.status.length > 0 ? 1 : 0) +
    (filterFromStore.assignedTeams && filterFromStore.assignedTeams.length > 0
      ? 1
      : 0) +
    (filterFromStore.assignedUserIds &&
    filterFromStore.assignedUserIds.length > 0
      ? 1
      : 0) +
    (filterFromStore.labels && filterFromStore.labels.length > 0 ? 1 : 0) +
    (filterFromStore.lifecycle ? 1 : 0) +
    (filterFromStore.phone && filterFromStore.phone !== "all" ? 1 : 0);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const listBgColor = isDark ? Colors.dark.bg : Colors.light.bg;
  const t = getInboxRowTheme(isDark);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* The design's search view replaces the list screen rather than
            layering over it, so only one <Inbox> is ever mounted against the
            contacts store. */}
        {searchOpen ? (
          <InboxSearchView
            query={searchTerm}
            onQueryChange={setSearchTerm}
            onClose={() => {
              setSearchTerm("");
              setSearchOpen(false);
            }}
          >
            {renderInboxContent()}
          </InboxSearchView>
        ) : (
          <>
            {/* Header + segments — one `--bg-surface` bar, as the design has
                them: title row, then the strip 12px below. */}
            <ScreenHeader
              title="Inbox"
              actions={
                <>
                  <HeaderIconButton onPress={() => setSearchOpen(true)}>
                    <Search size={20} color={t.fg2} />
                  </HeaderIconButton>
                  <RefreshButton />
                  <InboxButtons activeFilterCount={activeFilterCount} />
                </>
              }
              below={
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 12 }}
                  contentContainerStyle={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    gap: 8,
                  }}
                >
                  <SegmentPill
                    label="Open"
                    focused={activeTab === "Open"}
                    count={contactCounts.openCount}
                    onPress={() => setActiveTab("Open")}
                  />

                  {activeTab === "Open" && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        height: 32,
                        backgroundColor: isDark
                          ? Colors.dark.statusBg
                          : Colors.light.surface,
                        padding: 2,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: isDark
                          ? Colors.dark.pillBorder
                          : Colors.light.border,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setFilter({ ...filterFromStore, assignedUserIds: [] })
                        }
                        style={{
                          height: 26,
                          justifyContent: "center",
                          paddingHorizontal: 10,
                          borderRadius: 9999,
                          backgroundColor: !isMine
                            ? isDark
                              ? Colors.dark.pillBorder
                              : Colors.light.card
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Nunito_700Bold",
                            color: !isMine
                              ? isDark
                                ? Colors.dark.textPrimary
                                : Colors.light.textPrimary
                              : isDark
                                ? Colors.dark.pillText
                                : Colors.light.pillText,
                          }}
                        >
                          Everyone
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (userId) {
                            setFilter({
                              ...filterFromStore,
                              assignedUserIds: [userId],
                            });
                          }
                        }}
                        style={{
                          height: 26,
                          justifyContent: "center",
                          paddingHorizontal: 10,
                          borderRadius: 9999,
                          backgroundColor: isMine
                            ? isDark
                              ? Colors.dark.pillBorder
                              : Colors.light.card
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: "Nunito_700Bold",
                            color: isMine
                              ? isDark
                                ? Colors.dark.textPrimary
                                : Colors.light.textPrimary
                              : isDark
                                ? Colors.dark.pillText
                                : Colors.light.pillText,
                          }}
                        >
                          Mine
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  <SegmentPill
                    label="Closed"
                    focused={activeTab === "Closed"}
                    count={contactCounts.closedCount}
                    onPress={() => setActiveTab("Closed")}
                  />

                  <SegmentPill
                    label="All"
                    focused={activeTab === "All"}
                    count={contactCounts.allCount}
                    onPress={() => setActiveTab("All")}
                  />

                  <SegmentPill
                    label="Mine"
                    focused={activeTab === "Mine"}
                    onPress={() => setActiveTab("Mine")}
                  />

                  <SegmentPill
                    label="New"
                    focused={activeTab === "New"}
                    count={contactCounts.newCount}
                    onPress={() => setActiveTab("New")}
                  />

                  <SegmentPill
                    label="Favourites"
                    focused={activeTab === "Favourites"}
                    onPress={() => setActiveTab("Favourites")}
                  />
                </ScrollView>
              }
            />

            <View className="flex-1" style={{ backgroundColor: listBgColor }}>
              <InboxContentWrapper
                activeTab={activeTab}
                searchTerm={searchTerm}
                renderInboxContent={renderInboxContent}
                isDark={isDark}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// Wrapper to prevent re-rendering list background layout issues
const InboxContentWrapper = React.memo(function InboxContentWrapper({
  renderInboxContent,
  isDark,
}: {
  activeTab: string;
  searchTerm: string;
  renderInboxContent: () => React.ReactNode;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg,
      }}
    >
      {renderInboxContent()}
    </View>
  );
});
