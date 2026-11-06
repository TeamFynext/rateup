import { useLoggedInUser } from "@/api/api";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { memo, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  useColorScheme,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TeamMembersData } from "@/context/type";
import { namePreview } from "@/utils/chatbox_utils";
import { Check, Search, UserCheck, Users, UserX } from "lucide-react-native";
import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";
import Tap from "@/components/common/Tap";

export type AssigneePick =
  | { kind: "me"; key: string }
  | { kind: "unassign"; key: string }
  | { kind: "person"; key: string; member: TeamMembersData; teamNames: string }
  | { kind: "team"; key: string; teamId: string; name: string };

type Pick = AssigneePick;

/**
 * The assign sheet's search and rows, shared by one chat's assign and the inbox's
 * bulk assign. People are listed once however many teams they are in; a team row
 * hands each chat to one member in turn. Mirrors `AssigneeOptions` in rateup-ui.
 */
export default function AssigneeSheet({
  visible,
  onClose,
  title,
  ownerId,
  canUnassign,
  onChoose,
  pendingKey,
  error,
  busy,
  showCurrent = false,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  title: string;
  ownerId?: string;
  canUnassign: boolean;
  onChoose: (pick: AssigneePick) => void;
  pendingKey: string | null;
  /** Shown inline: a toast cannot render above this sheet's native Modal. */
  error: string | null;
  /** Replaces the list while a long-running pick is in flight, e.g. bulk progress. */
  busy?: React.ReactNode;
  /** One chat's sheet: say under the title who has it now ("Assigned to …" / "Unassigned"). */
  showCurrent?: boolean;
}>) {
  const [query, setQuery] = useState("");
  const { data: me } = useLoggedInUser();
  const { data: teamRes } = useTeamsByUser();
  const { data: teamMembers } = useTeamsMembersOfOrg();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const t = getInboxRowTheme(isDark);

  // RN's Modal mounts its children only once `visible` flips, so building the list
  // in the tap's frame stalls the slide. Paint the chrome first, the list after.
  const [contentSettled, setContentSettled] = useState(false);
  const contentReady = visible && contentSettled;

  // Clear the search each time the sheet opens. Done during render rather than in the
  // effect below, so the first frame already shows the empty search.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setQuery("");
  }

  useEffect(() => {
    if (!visible) return;
    // InteractionManager was removed in React Native 0.88; requestIdleCallback is its replacement.
    const handle = requestIdleCallback(() => setContentSettled(true));
    return () => {
      cancelIdleCallback(handle);
      setContentSettled(false);
    };
  }, [visible]);

  const myId = me?.userId;
  const picks = useMemo<Pick[]>(() => {
    const teams: { id: string; name: string }[] = teamRes?.data ?? [];
    const visibleTeams = new Map(teams.map((team) => [team.id, team.name]));
    const needle = query.trim().toLowerCase();
    const matches = (text: string) => !needle || text.toLowerCase().includes(needle);

    const people = ((teamMembers?.data ?? []) as TeamMembersData[])
      .filter((m) => m.teams.some((team) => visibleTeams.has(team.team_id)) && matches(m.name))
      .sort(
        (a, b) =>
          Number(b.id === myId) - Number(a.id === myId) ||
          Number(b.status === "online") - Number(a.status === "online") ||
          a.name.localeCompare(b.name),
      );

    const out: Pick[] = [];
    if (!needle && myId && ownerId !== myId) out.push({ kind: "me", key: "me" });
    if (!needle && canUnassign) out.push({ kind: "unassign", key: "unassign" });
    for (const member of people) {
      out.push({
        kind: "person",
        key: `user:${member.id}`,
        member,
        teamNames: member.teams
          .map((team) => visibleTeams.get(team.team_id))
          .filter(Boolean)
          .join(", "),
      });
    }
    for (const team of teams) {
      if (matches(team.name)) {
        out.push({ kind: "team", key: `team:${team.id}`, teamId: team.id, name: team.name });
      }
    }
    return out;
  }, [teamRes, teamMembers, query, myId, ownerId, canUnassign]);

  // How many people each team hands chats round to, for the team rows.
  const teamSizes = useMemo(() => {
    const sizes = new Map<string, number>();
    for (const member of (teamMembers?.data ?? []) as TeamMembersData[]) {
      for (const team of member.teams) sizes.set(team.team_id, (sizes.get(team.team_id) ?? 0) + 1);
    }
    return sizes;
  }, [teamMembers]);

  const ownerName = ownerId
    ? ((teamMembers?.data ?? []) as TeamMembersData[]).find((m) => m.id === ownerId)?.name
    : undefined;
  const actions = picks.filter((pick) => pick.kind === "me" || pick.kind === "unassign");
  const people = picks.filter((pick) => pick.kind === "person");
  const teams = picks.filter((pick) => pick.kind === "team");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Lets the slide run on the Android render thread instead of the JS one.
      hardwareAccelerated
      statusBarTranslucent
      onRequestClose={() => onClose()}
    >
      <Pressable className="flex-1" onPress={() => onClose()}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} />
      </Pressable>

      <SafeAreaView
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
          maxHeight: "75%",
          borderWidth: 1,
          borderColor: t.border1,
        }}
      >
        <View
          style={{
            width: 48,
            height: 6,
            backgroundColor: t.border1,
            borderRadius: 999,
            alignSelf: "center",
            marginBottom: 16,
          }}
        />
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: "InstrumentSans_700Bold", fontSize: 18, color: t.fg1 }}>
            {title}
          </Text>
          {showCurrent && (
            <Text
              numberOfLines={1}
              style={{
                marginTop: 2,
                fontFamily: "InstrumentSans_400Regular",
                fontSize: 13,
                color: t.fg3,
              }}
            >
              {ownerId ? `Assigned to ${ownerName || "a teammate"}` : "Unassigned"}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: t.border1,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginBottom: 12,
            backgroundColor: t.surface2,
          }}
        >
          <Search size={16} color={t.fg3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people or teams"
            placeholderTextColor={t.fg4}
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 10,
              fontFamily: "InstrumentSans_400Regular",
              fontSize: 15,
              color: t.fg1,
            }}
          />
        </View>

        {error && (
          <View
            style={{
              backgroundColor: t.dangerTone.soft,
              borderRadius: 10,
              padding: 10,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: t.dangerTone.fg,
                fontFamily: "InstrumentSans_600SemiBold",
                fontSize: 13,
              }}
            >
              Could not change the assignee. {error}
            </Text>
          </View>
        )}

        {busy ? (
          <View style={{ minHeight: 220, justifyContent: "center" }}>{busy}</View>
        ) : !contentReady ? (
          // Reserves the sheet's height so it doesn't resize a frame later.
          <View style={{ minHeight: 220, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="small" color={t.brand} />
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            style={{ minHeight: 220 }}
          >
            {picks.length === 0 && (
              <Text
                style={{
                  color: t.fg3,
                  textAlign: "center",
                  paddingVertical: 24,
                  fontFamily: "InstrumentSans_400Regular",
                }}
              >
                No one matches
              </Text>
            )}
            {actions.length > 0 && (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {actions.map((pick) => (
                  <ActionButton
                    key={pick.key}
                    pick={pick}
                    t={t}
                    pending={pendingKey === pick.key}
                    onPress={onChoose}
                  />
                ))}
              </View>
            )}
            {people.length > 0 && <SectionLabel t={t}>People</SectionLabel>}
            {people.map((pick) => (
              <PickRow
                key={pick.key}
                pick={pick}
                t={t}
                isOwner={pick.kind === "person" && pick.member.id === ownerId}
                pending={pendingKey === pick.key}
                onPress={onChoose}
              />
            ))}
            {teams.length > 0 && <SectionLabel t={t}>Teams</SectionLabel>}
            {teams.map((pick) => (
              <PickRow
                key={pick.key}
                pick={pick}
                t={t}
                isOwner={false}
                pending={pendingKey === pick.key}
                onPress={onChoose}
                teamSize={pick.kind === "team" ? teamSizes.get(pick.teamId) : undefined}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function SectionLabel({ t, children }: Readonly<{ t: InboxRowTheme; children: string }>) {
  return (
    <Text
      style={{
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 4,
        fontFamily: "InstrumentSans_700Bold",
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: t.fg3,
      }}
    >
      {children}
    </Text>
  );
}

/** "Assign to me" and "Unassign", side by side above the lists. */
const ActionButton = memo(function ActionButton({
  pick,
  t,
  pending,
  onPress,
}: Readonly<{ pick: Pick; t: InboxRowTheme; pending: boolean; onPress: (pick: Pick) => void }>) {
  const isMe = pick.kind === "me";
  const color = isMe ? t.brand : t.fg2;
  return (
    <Tap
      onPress={() => onPress(pick)}
      accessibilityRole="button"
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        borderRadius: 12,
        backgroundColor: isMe ? t.brandSoft : t.surface2,
        borderWidth: 1,
        borderColor: isMe ? t.brandSoft : t.border1,
      }}
      pressedStyle={{ opacity: 0.7 }}
    >
      {pending ? (
        <ActivityIndicator size="small" color={color} />
      ) : isMe ? (
        <UserCheck size={17} color={color} />
      ) : (
        <UserX size={17} color={color} />
      )}
      <Text style={{ fontFamily: "InstrumentSans_600SemiBold", fontSize: 14, color }}>
        {isMe ? "Assign to me" : "Unassign"}
      </Text>
    </Tap>
  );
});

const AVATAR = 36;

const PickRow = memo(function PickRow({
  pick,
  t,
  isOwner,
  pending,
  onPress,
  teamSize,
}: Readonly<{
  pick: Pick;
  t: InboxRowTheme;
  isOwner: boolean;
  pending: boolean;
  onPress: (pick: Pick) => void;
  /** Team rows: how many people the chat can rotate to. */
  teamSize?: number;
}>) {
  let icon: React.ReactNode;
  let title = "";
  let subtitle: string | null = null;
  if (pick.kind === "team") {
    icon = (
      <View
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: 10,
          backgroundColor: t.surface2,
          borderWidth: 1,
          borderColor: t.border1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Users size={17} color={t.fg2} />
      </View>
    );
    title = pick.name;
    subtitle =
      teamSize != null
        ? `Round-robin · ${teamSize} member${teamSize === 1 ? "" : "s"}`
        : "Round-robin";
  } else if (pick.kind === "person") {
    icon = (
      <View
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: AVATAR / 2,
          backgroundColor: isOwner ? t.brand : t.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: isOwner ? t.onAccent : t.brand,
            fontSize: 13,
            fontFamily: "InstrumentSans_700Bold",
          }}
        >
          {namePreview(pick.member.name)}
        </Text>
        {pick.member.status === "online" && (
          <View
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 11,
              height: 11,
              borderRadius: 6,
              backgroundColor: t.success,
              borderWidth: 2,
              borderColor: t.surface,
            }}
          />
        )}
      </View>
    );
    title = pick.member.name;
    subtitle = pick.teamNames || null;
  }

  return (
    <Tap
      onPress={() => onPress(pick)}
      accessibilityRole="button"
      accessibilityState={{ selected: isOwner }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: isOwner ? t.brandSoft : "transparent",
      }}
      pressedStyle={{ backgroundColor: t.surface2 }}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: "InstrumentSans_600SemiBold", fontSize: 15, color: t.fg1 }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            numberOfLines={1}
            style={{
              marginTop: 1,
              fontFamily: "InstrumentSans_400Regular",
              fontSize: 12.5,
              color: t.fg3,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {pending ? (
        <ActivityIndicator size="small" color={t.brand} />
      ) : (
        isOwner && <Check size={18} color={t.brand} />
      )}
    </Tap>
  );
});
