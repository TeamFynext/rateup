import { router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import type { UserTeam } from "@/api/teams/teams.api";
import { useTeamsByUser, useTeamsMembersOfOrg } from "@/api/teams/teams.query";
import ScreenHeader from "@/components/common/ScreenHeader";
import {
  Card,
  CenteredSpinner,
  Divider,
  EmptyState,
  FONT,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import type { TeamMembersData } from "@/context/type";

/** The web's fallback team colour (`TeamPage.tsx`). */
export const DEFAULT_TEAM_COLOR = "#7F77DD";

export function TeamSwatch({ team, size = 38 }: Readonly<{ team: UserTeam; size?: number }>) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: team.color || DEFAULT_TEAM_COLOR,
      }}
    >
      <Text style={{ fontFamily: FONT.bold, fontSize: size * 0.42, color: "#FFFFFF" }}>
        {team.name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function TeamsList() {
  const { t } = useTheme();
  const teamsQuery = useTeamsByUser();
  const membersQuery = useTeamsMembersOfOrg();
  const [refreshing, setRefreshing] = useState(false);

  const refetchMembers = membersQuery.refetch;
  // Statuses change while the tab is in the background, so they are re-read on every visit.
  useFocusEffect(
    useCallback(() => {
      refetchMembers();
    }, [refetchMembers]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([teamsQuery.refetch(), membersQuery.refetch()]);
    setRefreshing(false);
  };

  // `/team/user` answers a user with no teams with a message and no `data`.
  const teams = (teamsQuery.data?.data ?? []) as UserTeam[];
  const members = (membersQuery.data?.data ?? []) as TeamMembersData[];

  const summary = (team: UserTeam) => {
    const inTeam = members.filter((m) => m.teams.some((tm) => tm.team_id === team.id));
    const total = team._count?.members ?? inTeam.length;
    const available = inTeam.filter((m) => m.status === "online" && !m.isPaused).length;
    const people = `${total} member${total === 1 ? "" : "s"}`;
    return membersQuery.data ? `${people} · ${available} available` : people;
  };

  let body: React.ReactNode;
  if (teamsQuery.isLoading) {
    body = <CenteredSpinner />;
  } else if (teamsQuery.isError) {
    body = (
      <EmptyState
        title="Could not load your teams"
        body="Check your internet connection and pull to refresh."
      />
    );
  } else if (teams.length === 0) {
    body = (
      <EmptyState
        title="You are not in a team yet"
        body="An admin can add you to a team from the web app."
      />
    );
  } else {
    body = (
      <Card padding={0}>
        {teams.map((team, index) => (
          <View key={team.id}>
            {index > 0 ? <Divider /> : null}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/protected/teams/[teamId]",
                  params: { teamId: team.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`${team.name}, ${summary(team)}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
              }}
            >
              <TeamSwatch team={team} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: FONT.semibold, fontSize: 15, color: t.fg1 }}
                >
                  {team.name}
                </Text>
                <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
                  {summary(team)}
                </Text>
              </View>
              <ChevronRight size={18} color={t.fg4} />
            </Pressable>
          </View>
        ))}
      </Card>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader title="Teams" />
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
