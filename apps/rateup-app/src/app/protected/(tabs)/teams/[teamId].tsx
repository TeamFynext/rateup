import { useLocalSearchParams } from "expo-router";

import TeamMembers from "@/components/teams/TeamMembers";

export default function TeamScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  return <TeamMembers teamId={teamId} />;
}
