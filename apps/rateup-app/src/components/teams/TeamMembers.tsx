import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { useLoggedInUser } from "@/api/api";
import type { UserTeam } from "@/api/teams/teams.api";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import Image from "@/components/common/Image";
import ScreenHeader from "@/components/common/ScreenHeader";
import { dotColor, STATUS_LABEL } from "@/components/home/StatusPicker";
import {
  Card,
  CenteredSpinner,
  Divider,
  EmptyState,
  FONT,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import type { TeamMembersData } from "@/context/type";
import { roleLabelOf } from "@/hooks/usePermissions";
import { namePreview } from "@/utils/chatbox_utils";

const STATUS_ORDER: Record<TeamMembersData["status"], number> = { online: 0, busy: 1, offline: 2 };
const AVATAR = 40;

function MemberRow({ member, isMe }: Readonly<{ member: TeamMembersData; isMe: boolean }>) {
  const { t } = useTheme();
  const role = roleLabelOf(member);
  const statusText = member.isPaused ? "Paused" : STATUS_LABEL[member.status];

  return (
    <View
      accessibilityLabel={`${member.name}${isMe ? " (you)" : ""}, ${role}, ${statusText}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        opacity: member.isPaused ? 0.6 : 1,
      }}
    >
      <View>
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.brandInk,
          }}
        >
          {member.profilePhoto ? (
            <Image
              source={{
                uri: `${process.env.EXPO_PUBLIC_AWS_CLOUDFRONT_URL}${member.profilePhoto}`,
              }}
              style={{ width: AVATAR, height: AVATAR }}
            />
          ) : (
            <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: "#FFFFFF" }}>
              {namePreview(member.name ?? "")}
            </Text>
          )}
        </View>
        <View
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 13,
            height: 13,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: t.surface,
            backgroundColor: dotColor(t, member.status),
          }}
        />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}>
          {member.name || member.email}
          {isMe ? <Text style={{ fontFamily: FONT.regular, color: t.fg3 }}> (you)</Text> : null}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
          {statusText}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: t.brandSoft,
        }}
      >
        <Text style={{ fontFamily: FONT.semibold, fontSize: 12, color: t.brand }}>{role}</Text>
      </View>
    </View>
  );
}

export default function TeamMembers({ teamId }: Readonly<{ teamId: string }>) {
  const { t } = useTheme();
  const { data: me } = useLoggedInUser();
  const teamsQuery = useTeamsByUser();
  const membersQuery = useTeamsMembersOfOrg();
  const [refreshing, setRefreshing] = useState(false);

  const refetchMembers = membersQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      refetchMembers();
    }, [refetchMembers]),
  );

  const team = ((teamsQuery.data?.data ?? []) as UserTeam[]).find((tm) => tm.id === teamId);

  const members = useMemo(
    () =>
      ((membersQuery.data?.data ?? []) as TeamMembersData[])
        .filter((m) => m.teams.some((tm) => tm.team_id === teamId))
        .sort(
          (a, b) =>
            Number(Boolean(a.isPaused)) - Number(Boolean(b.isPaused)) ||
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            (a.name ?? "").localeCompare(b.name ?? ""),
        ),
    [membersQuery.data, teamId],
  );
  const available = members.filter((m) => m.status === "online" && !m.isPaused).length;

  const refresh = async () => {
    setRefreshing(true);
    await membersQuery.refetch();
    setRefreshing(false);
  };

  let body: React.ReactNode;
  if (membersQuery.isLoading) {
    body = <CenteredSpinner />;
  } else if (membersQuery.isError || !membersQuery.data) {
    body = (
      <EmptyState
        title="Could not load the members"
        body="Check your internet connection and pull to refresh."
      />
    );
  } else if (members.length === 0) {
    body = <EmptyState title="No members in this team" />;
  } else {
    body = (
      <View style={{ gap: 10 }}>
        <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg3, paddingHorizontal: 4 }}>
          {members.length} member{members.length === 1 ? "" : "s"} · {available} available
        </Text>
        <Card padding={0}>
          {members.map((member, index) => (
            <View key={member.id}>
              {index > 0 ? <Divider /> : null}
              <MemberRow member={member} isMe={member.id === me?.userId} />
            </View>
          ))}
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title={team?.name ?? "Team"} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}
