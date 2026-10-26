import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useInfiniteQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
} from "lucide-react-native";

import { type CallLogFilters, type CallLogRow, getCallLog } from "@/api/whatsapp/calling";
import { Colors } from "@/constants/colors";
import {
  getInboxHeaderBg,
  getInboxRowTheme,
  inboxAvatarColors,
  paletteIndex,
} from "@/constants/inboxDesign";
import { namePreview } from "@/utils/chatbox_utils";
import { useStartCall } from "@/components/calling/CallContactButton";
import { usePermissions } from "@/hooks/usePermissions";
import { useCallStore } from "@/store/callStore";
import { callingSupported } from "@/utils/callMedia";

/** How far back the history reaches. The API needs a range; three months covers "recent". */
const HISTORY_DAYS = 90;

type Tab = "all" | "missed" | "incoming" | "outgoing";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
  { key: "incoming", label: "Incoming" },
  { key: "outgoing", label: "Outgoing" },
];

function filtersFor(tab: Tab, range: { from: Date; to: Date }): CallLogFilters {
  switch (tab) {
    case "missed":
      return { ...range, outcome: "missed" };
    case "incoming":
      return { ...range, direction: "USER_INITIATED" };
    case "outgoing":
      return { ...range, direction: "BUSINESS_INITIATED" };
    default:
      return range;
  }
}

/** `1:05`, `12:30`, `1:02:03`. */
function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** The heading a call is listed under: "Today", "Yesterday", the weekday, then the date. */
function dayLabel(iso: string): string {
  const at = dayjs(iso);
  const now = dayjs();
  if (at.isSame(now, "day")) return "Today";
  if (at.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (now.diff(at, "day") < 7) return at.format("dddd");
  return at.format(at.isSame(now, "year") ? "D MMMM" : "D MMMM YYYY");
}

/**
 * WhatsApp calls on the numbers this person can reach — the same scope as their inbox, applied
 * by the API. Tapping a call opens the conversation, where the call button calls back.
 */
export default function CallHistoryScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const [tab, setTab] = useState<Tab>("all");
  // Fixed for the life of the screen, so the query key is stable; pull to refresh moves it.
  const [range, setRange] = useState(() => ({
    from: dayjs().subtract(HISTORY_DAYS, "day").toDate(),
    to: new Date(),
  }));
  const filters = useMemo(() => filtersFor(tab, range), [tab, range]);

  const query = useInfiniteQuery({
    queryKey: ["wa-call-log", tab, range.to.toISOString()],
    queryFn: ({ pageParam }) => getCallLog(filters, pageParam || undefined),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const { can } = usePermissions();
  const onCall = useCallStore((s) => s.active !== null);
  const { start, pendingFor, sheet } = useStartCall();
  // Calling back needs the native calling modules and the right to reply.
  const canCallBack = callingSupported && can("inbox.reply");

  const refresh = () =>
    setRange({ from: dayjs().subtract(HISTORY_DAYS, "day").toDate(), to: new Date() });

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? Colors.dark.bg : Colors.light.bg }}>
      <View
        style={{
          backgroundColor: getInboxHeaderBg(isDark),
          borderBottomWidth: 1,
          borderBottomColor: t.border1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={21} color={t.fg1} />
          </Pressable>
          <Text style={{ fontFamily: "Figtree_800ExtraBold", fontSize: 18, color: t.fg1 }}>
            Call history
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
          {TABS.map((item) => {
            const selected = item.key === tab;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selected ? Colors.brand.blue : t.border1,
                  backgroundColor: selected ? Colors.brand.blue : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Figtree_700Bold",
                    fontSize: 13,
                    color: selected ? "#fff" : t.fg3,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item, index }) => {
          const day = dayLabel(item.createdAt);
          const newDay = index === 0 || dayLabel(rows[index - 1]!.createdAt) !== day;
          return (
            <>
              {newDay ? (
                <Text
                  style={{
                    fontFamily: "Figtree_700Bold",
                    fontSize: 12,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: t.fg4,
                    paddingHorizontal: 16,
                    paddingTop: index === 0 ? 14 : 20,
                    paddingBottom: 4,
                  }}
                >
                  {day}
                </Text>
              ) : null}
              <CallRow
                row={item}
                onPress={() =>
                  item.contactId && router.push(`/protected/chat/${item.contactId}` as never)
                }
                // Back on the number the customer called (or was called from), so they
                // see the same business calling.
                onCallBack={
                  canCallBack && item.contactId
                    ? () =>
                        void start({
                          phoneId: item.phoneId,
                          contactId: item.contactId!,
                          name: item.contactName,
                          phone: item.contactPhone ?? item.customerWaId,
                        })
                    : undefined
                }
                callBackPending={pendingFor === item.contactId}
                callBackDisabled={onCall || (pendingFor !== null && pendingFor !== item.contactId)}
              />
            </>
          );
        }}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={refresh} />}
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={{ marginTop: 48 }} color={Colors.brand.blue} />
          ) : (
            <View style={{ alignItems: "center", marginTop: 64, paddingHorizontal: 32, gap: 6 }}>
              <Text style={{ fontFamily: "Figtree_700Bold", fontSize: 16, color: t.fg1 }}>
                {query.isError ? "Could not load calls" : "No calls yet"}
              </Text>
              <Text
                style={{
                  fontFamily: "InstrumentSans_400Regular",
                  fontSize: 13,
                  color: t.fg3,
                  textAlign: "center",
                }}
              >
                {query.isError
                  ? "Pull down to try again."
                  : `WhatsApp calls from the last ${HISTORY_DAYS} days show up here.`}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.brand.blue} />
          ) : undefined
        }
      />
      {sheet}
    </View>
  );
}

function CallRow({
  row,
  onPress,
  onCallBack,
  callBackPending,
  callBackDisabled,
}: Readonly<{
  row: CallLogRow;
  onPress: () => void;
  /** Absent when this person cannot call from here. */
  onCallBack?: () => void;
  callBackPending: boolean;
  callBackDisabled: boolean;
}>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);
  const outbound = row.direction === "BUSINESS_INITIATED";
  const talked = row.status === "COMPLETED" || row.status === "ACCEPTED";
  const missed = row.status === "MISSED" || row.status === "FAILED";
  const name = row.contactName ?? `+${row.customerWaId}`;
  const avatar =
    inboxAvatarColors[paletteIndex(row.contactId ?? row.customerWaId, inboxAvatarColors.length)];

  const icon = missed ? (
    <PhoneMissed size={15} color={t.danger} />
  ) : row.status === "REJECTED" ? (
    <PhoneOff size={15} color={t.fg4} />
  ) : outbound ? (
    <PhoneOutgoing size={15} color={Colors.accent.whatsapp} />
  ) : (
    <PhoneIncoming size={15} color={Colors.accent.whatsapp} />
  );

  const what = missed
    ? outbound
      ? "Not answered"
      : "Missed"
    : row.status === "REJECTED"
      ? outbound
        ? "Declined by customer"
        : "Declined"
      : outbound
        ? "Outgoing"
        : "Incoming";
  const detail = [
    what,
    talked && row.durationSeconds ? formatDuration(row.durationSeconds) : null,
    row.agentName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      disabled={!row.contactId}
      accessibilityRole="button"
      accessibilityLabel={`${what} call, ${name}`}
      // A plain object, not `({ pressed }) => …`: NativeWind's Pressable wrapper drops
      // function styles, and the row lost its whole layout with it.
      android_ripple={{ color: t.border1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: avatar,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: "Figtree_800ExtraBold", fontSize: 15, color: "#fff" }}>
          {namePreview(name)}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "Figtree_700Bold",
            fontSize: 15,
            color: missed ? t.danger : t.fg1,
          }}
        >
          {name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {icon}
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: "InstrumentSans_400Regular", fontSize: 13, color: t.fg3 }}
          >
            {detail}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: "InstrumentSans_400Regular", fontSize: 12, color: t.fg4 }}>
        {dayjs(row.createdAt).format("HH:mm")}
      </Text>
      {onCallBack ? (
        <Pressable
          onPress={onCallBack}
          disabled={callBackPending || callBackDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Call ${name} back`}
          hitSlop={6}
          android_ripple={{ color: t.border1, borderless: true, radius: 22 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "rgba(37,211,102,0.14)" : "rgba(37,211,102,0.12)",
            opacity: callBackDisabled ? 0.4 : 1,
          }}
        >
          {callBackPending ? (
            <ActivityIndicator size="small" color={Colors.accent.whatsapp} />
          ) : (
            <Phone size={18} color={Colors.accent.whatsapp} />
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}
