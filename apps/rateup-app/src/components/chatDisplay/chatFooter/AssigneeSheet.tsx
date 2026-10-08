import { useLoggedInUser } from "@/api/api";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import { memo, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  InteractionManager,
  Modal,
  ScrollView,
  useColorScheme,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TeamMembersData } from "@/context/type";
import { namePreview } from "@/utils/chatbox_utils";
import { Check, Search, Shuffle, UserCheck, UserX } from "lucide-react-native";
import { getInboxRowTheme, type InboxRowTheme } from "@/constants/inboxDesign";

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
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    const task = InteractionManager.runAfterInteractions(() => setContentSettled(true));
    return () => {
      task.cancel();
      setContentSettled(false);
    };
  }, [visible]);

  const picks = useMemo<Pick[]>(() => {
    const teams: { id: string; name: string }[] = teamRes?.data ?? [];
    const visibleTeams = new Map(teams.map((team) => [team.id, team.name]));
    const needle = query.trim().toLowerCase();
    const matches = (text: string) => !needle || text.toLowerCase().includes(needle);

    const people = ((teamMembers?.data ?? []) as TeamMembersData[])
      .filter((m) => m.teams.some((team) => visibleTeams.has(team.team_id)) && matches(m.name))
      .sort(
        (a, b) =>
          Number(b.id === me?.userId) - Number(a.id === me?.userId) ||
          Number(b.status === "online") - Number(a.status === "online") ||
          a.name.localeCompare(b.name),
      );

    const out: Pick[] = [];
    if (!needle && me?.userId && ownerId !== me.userId) out.push({ kind: "me", key: "me" });
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
  }, [teamRes, teamMembers, query, me?.userId, ownerId, canUnassign]);

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
        <Text
          style={{
            fontFamily: "InstrumentSans_700Bold",
            fontSize: 18,
            color: t.fg1,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderWidth: 1,
            borderColor: t.border1,
            borderRadius: 10,
            paddingHorizontal: 10,
            marginBottom: 8,
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
            {picks.map((pick) => (
              <PickRow
                key={pick.key}
                pick={pick}
                t={t}
                isOwner={pick.kind === "person" && pick.member.id === ownerId}
                pending={pendingKey === pick.key}
                onPress={onChoose}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const PickRow = memo(function PickRow({
  pick,
  t,
  isOwner,
  pending,
  onPress,
}: Readonly<{
  pick: Pick;
  t: InboxRowTheme;
  isOwner: boolean;
  pending: boolean;
  onPress: (pick: Pick) => void;
}>) {
  let icon: React.ReactNode;
  let title: string;
  let subtitle: string | null = null;
  let titleColor = t.fg1;
  if (pick.kind === "me") {
    icon = <UserCheck size={18} color={t.brand} />;
    title = "Assign to me";
    titleColor = t.brand;
  } else if (pick.kind === "unassign") {
    icon = <UserX size={18} color={t.fg3} />;
    title = "Unassign";
  } else if (pick.kind === "team") {
    icon = <Shuffle size={18} color={t.fg3} />;
    title = pick.name;
    subtitle = "Auto-assign to whoever's turn it is";
  } else {
    icon = (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: t.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: t.brand, fontSize: 12, fontFamily: "InstrumentSans_700Bold" }}>
          {namePreview(pick.member.name)}
        </Text>
        {pick.member.status === "online" && (
          <View
            style={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: 10,
              height: 10,
              borderRadius: 5,
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
    <Pressable
      onPress={() => onPress(pick)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: pressed ? t.surface2 : "transparent",
      })}
    >
      <View style={{ width: 32, alignItems: "center" }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: "InstrumentSans_600SemiBold", fontSize: 15, color: titleColor }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            numberOfLines={1}
            style={{ fontFamily: "InstrumentSans_400Regular", fontSize: 12, color: t.fg3 }}
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
    </Pressable>
  );
});
