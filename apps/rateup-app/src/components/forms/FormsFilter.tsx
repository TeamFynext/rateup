import { router } from "expo-router";
import { Check } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTeamsByUser } from "@/api/teams/teams.query";
import ScreenHeader from "@/components/common/ScreenHeader";
import SegmentedControl from "@/components/common/SegmentedControl";
import {
  CashierButton,
  Divider,
  FONT,
  PressableRow,
  useTheme,
} from "@/components/loyalty/cashier/ui";
import { TeamSwatch } from "@/components/teams/TeamsList";

type FilterStore = {
  teamId: string;
  setTeamId: (id: string) => void;
  status: string;
  setStatus: (status: any) => void;
  sortByDate: "latest" | "oldest";
  setSortByDate: (order: "latest" | "oldest") => void;
  alphabetical: "A-Z" | "Z-A" | null;
  setAlphabetical: (order: "A-Z" | "Z-A" | null) => void;
  resetFilters: () => void;
};

const DATE_OPTIONS = [
  { value: "latest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

const NAME_OPTIONS = [
  { value: "none", label: "Off" },
  { value: "A-Z", label: "A–Z" },
  { value: "Z-A", label: "Z–A" },
] as const;

/** The Forms tab's filter screen; WA Flow and Web Forms differ only in store and statuses. */
export default function FormsFilter({
  store,
  statusOptions,
}: Readonly<{
  store: FilterStore;
  statusOptions: readonly { value: string; label: string }[];
}>) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: teamData } = useTeamsByUser();
  const teams: any[] = teamData?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: t.pageBg }}>
      <ScreenHeader
        title="Filter"
        onBack={() => router.back()}
        actions={
          <Pressable
            onPress={store.resetFilters}
            hitSlop={8}
            accessibilityRole="button"
            style={{ paddingHorizontal: 4, paddingVertical: 8 }}
          >
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.brand }}>Reset</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        <Section title="Status">
          <SegmentedControl
            options={statusOptions}
            value={store.status}
            onChange={store.setStatus}
            inset={0}
          />
        </Section>

        <Section title="Date">
          <SegmentedControl
            options={DATE_OPTIONS}
            value={store.sortByDate}
            onChange={store.setSortByDate}
            inset={0}
          />
        </Section>

        <Section title="Name">
          <SegmentedControl
            options={NAME_OPTIONS}
            value={store.alphabetical ?? "none"}
            onChange={(v) => store.setAlphabetical(v === "none" ? null : v)}
            inset={0}
          />
        </Section>

        <Section title="Team">
          <View
            style={{
              backgroundColor: t.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border1,
              overflow: "hidden",
            }}
          >
            {[{ id: "all", name: "All teams" }, ...teams].map((team, index) => {
              const selected = store.teamId === team.id;
              return (
                <View key={team.id}>
                  {index > 0 ? <Divider /> : null}
                  <PressableRow
                    onPress={() => store.setTeamId(team.id)}
                    accessibilityLabel={`${team.name}${selected ? ", selected" : ""}`}
                  >
                    {team.id === "all" ? null : <TeamSwatch team={team} size={28} />}
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontFamily: selected ? FONT.semibold : FONT.regular,
                        fontSize: 15,
                        color: t.fg1,
                      }}
                    >
                      {team.name}
                    </Text>
                    {selected ? <Check size={18} color={t.brand} /> : null}
                  </PressableRow>
                </View>
              );
            })}
          </View>
        </Section>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: t.border1,
          backgroundColor: t.surface,
        }}
      >
        <CashierButton label="Show results" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: FONT.medium,
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: t.fg3,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
