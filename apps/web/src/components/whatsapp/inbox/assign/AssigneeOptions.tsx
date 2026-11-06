import { IconArrowsShuffle, IconUserCheck, IconUserOff } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import {
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";

export type AssigneeOption =
  | { kind: "me"; value: string; label: string }
  | { kind: "unassign"; value: string; label: string }
  | { kind: "person"; value: string; label: string; member: TeamMembersData; teamNames: string }
  | { kind: "team"; value: string; label: string; team: TeamData };

export interface AssigneeOptionGroup {
  value: string;
  label: string | null;
  items: AssigneeOption[];
}

/**
 * The picker's rows, shared by the ticket panel and the bulk-assign dialog so the
 * two read the same. People are listed once however many teams they are in.
 */
export function useAssigneeOptions({
  ownerId,
  canUnassign,
  withTeams,
}: {
  ownerId?: string;
  canUnassign: boolean;
  withTeams: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: membersRes, isPending: membersPending } = useTeamsMembersOfOrg();
  const { data: teamsRes, isPending: teamsPending } = useTeamsByUser();

  const groups = useMemo<AssigneeOptionGroup[]>(() => {
    const teams = teamsRes?.data ?? [];
    const visibleTeamIds = new Set(teams.map((team) => team.id));
    const teamName = new Map(teams.map((team) => [team.id, team.name]));
    const people = (membersRes?.data ?? [])
      .filter((m) => m.teams.some((team) => visibleTeamIds.has(team.team_id)))
      .sort(
        (a, b) =>
          Number(b.id === user?.userId) - Number(a.id === user?.userId) ||
          Number(b.status === "online") - Number(a.status === "online") ||
          a.name.localeCompare(b.name),
      );

    const actions: AssigneeOption[] = [];
    if (user?.userId && ownerId !== user.userId) {
      actions.push({ kind: "me", value: "me", label: t("Assign to me") });
    }
    if (canUnassign) {
      actions.push({ kind: "unassign", value: "unassign", label: t("Unassign") });
    }

    return [
      { value: "actions", label: null, items: actions },
      {
        value: "people",
        label: t("People"),
        items: people.map((member) => ({
          kind: "person" as const,
          value: `user:${member.id}`,
          label: member.name,
          member,
          teamNames: member.teams
            .map((team) => teamName.get(team.team_id))
            .filter(Boolean)
            .join(", "),
        })),
      },
      {
        value: "teams",
        label: t("Auto-assign in a team"),
        items: withTeams
          ? teams.map((team) => ({
              kind: "team" as const,
              value: `team:${team.id}`,
              label: team.name,
              team,
            }))
          : [],
      },
    ].filter((group) => group.items.length > 0);
  }, [membersRes, teamsRes, user?.userId, ownerId, canUnassign, withTeams, t]);

  const members = membersRes?.data;
  return {
    groups,
    isPending: membersPending || teamsPending,
    nameOf: (userId: string) => members?.find((m) => m.id === userId)?.name ?? user?.userName ?? "",
    /** A team of this person's that the current user can see; bulk assign needs one. */
    visibleTeamOf: (member: TeamMembersData) =>
      member.teams.find((team) => teamsRes?.data?.some((v) => v.id === team.team_id))?.team_id ??
      "",
  };
}

/** Search box and grouped rows. Must sit inside a `Combobox` whose `items` are the groups. */
export function AssigneeOptionList({
  ownerId,
  placeholder,
  listClassName,
  autoFocus,
}: Readonly<{
  ownerId?: string;
  placeholder: string;
  listClassName?: string;
  autoFocus?: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <>
      <ComboboxChipsInput
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="h-9 w-full shrink-0 border-b border-border px-3 text-sm"
      />
      <ComboboxEmpty>{t("No one matches")}</ComboboxEmpty>
      <ComboboxList className={cn(listClassName)}>
        {(group: AssigneeOptionGroup) => (
          <ComboboxGroup key={group.value} items={group.items}>
            {group.label && <ComboboxLabel>{group.label}</ComboboxLabel>}
            <ComboboxCollection>
              {(item: AssigneeOption) => (
                <ComboboxItem key={item.value} value={item}>
                  <OptionRow
                    item={item}
                    isOwner={item.kind === "person" && item.member.id === ownerId}
                  />
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxGroup>
        )}
      </ComboboxList>
    </>
  );
}

function OptionRow({ item, isOwner }: Readonly<{ item: AssigneeOption; isOwner: boolean }>) {
  const { t } = useTranslation();
  if (item.kind === "me") {
    return (
      <>
        <IconUserCheck className="text-primary" />
        <span className="font-semibold text-primary">{item.label}</span>
      </>
    );
  }
  if (item.kind === "unassign") {
    return (
      <>
        <IconUserOff className="text-muted-foreground" />
        <span>{item.label}</span>
      </>
    );
  }
  if (item.kind === "team") {
    return (
      <>
        <IconArrowsShuffle className="text-muted-foreground" />
        <span className="truncate">{item.label}</span>
      </>
    );
  }
  return (
    <>
      <CreativeAvatar
        name={item.member.name}
        showOnlineStatus
        isOnline={item.member.status === "online"}
        size="xs"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          {item.member.name}
          {isOwner && <span className="ml-1 text-muted-foreground">· {t("Owner")}</span>}
        </span>
        {item.teamNames && (
          <span className="block truncate text-[11px] text-muted-foreground">{item.teamNames}</span>
        )}
      </span>
    </>
  );
}
