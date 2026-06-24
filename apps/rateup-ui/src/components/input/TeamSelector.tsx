import type { SelectProps } from "@mantine/core";
import { Card, Group, Skeleton, Text } from "@mantine/core";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";
import { ContainedSelection } from "./ContainedInput/ContainedInput.tsx";

interface TeamSelectorProps extends SelectProps {
  value?: string;
  onChange?: (teamId: string) => void;
  label?: string;
  enableAll?: boolean;
  enableDefaultValue?: boolean;
}
export function TeamSelector({
  value,
  onChange,
  label = "",
  enableAll = false,
  enableDefaultValue = true,
  className,
  ...props
}: Readonly<TeamSelectorProps>) {
  // TODO: remove some nesting on results of the query?
  const { data: teamRes, isPending: teamsLoading, isError } = useTeamsByUser();

  const { t: translations } = useTranslation();

  const teams = teamRes?.data;

  const teamOptions = teams
    ? teams.map((team) => ({
        value: team.id,
        label: team.name,
      }))
    : [];
  if (enableAll && teamOptions.length)
    teamOptions.unshift({
      value: "all",
      label: translations("All Teams") || "All Teams",
    });

  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (value) return;
    if (enableAll) {
      onChange("all");
    } else if (teamOptions.length > 0 && enableDefaultValue) {
      onChange(teamOptions[0].value);
    }
  }, [teamOptions, value]);

  if (isError) {
    return <Text>{translations("Something went wrong!")}</Text>;
  }
  if (teamsLoading) {
    return (
      <Card h={40} w={240} radius={"md"} withBorder p={0}>
        <Group justify="space-between" w={"100%"} my={"auto"}>
          <Skeleton w={100} h={17} ml={"xs"} />
          <Skeleton w={20} h={17} mr={"xs"} />
        </Group>
      </Card>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} defaultValue={label}>
      <SelectTrigger className={`${className || ""}`}>
        <div>
          <Users className="size-4 text-muted-foreground" />
        </div>
        <SelectValue placeholder="Team" />
      </SelectTrigger>
      <SelectContent className="z-[1050]">
        {teamOptions.map((team) => (
          <SelectItem key={team.value} value={team.value}>
            {team.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <ContainedSelection
      allowDeselect={false}
      data={teamOptions}
      defaultValue={enableDefaultValue ? teamOptions[0].value : null}
      onChange={onChange}
      label={label}
      value={value}
      nothingFoundMessage={translations("No teams found!")}
      {...props}
    />
  );
}
