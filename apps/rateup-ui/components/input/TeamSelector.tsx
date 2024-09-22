import { useEffect } from "react";

import { Card, Group, SelectProps, Skeleton, Text } from "@mantine/core";

import useTranslations from "@/dictionaries/useTranslation";

import { useTeamsByUser } from "../../backend/team/team.query";
import { ContainedSelection } from "./ContainedInput/ContainedInput";

interface TeamSelectorProps extends SelectProps {
  value?: string;
  onChange?: (teamId: string) => void;
  label?: string;
  enableAll?: boolean;
}
export function TeamSelector({
  value,
  onChange,
  label = "",
  enableAll = false,
  ...props
}: TeamSelectorProps) {
  // TODO: remove some nesting on results of the query?
  const {
    data: teamRes,
    isPending: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();
  const { translations } = useTranslations();
  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (value) return;
    if (enableAll) {
      onChange("all");
    } else if (teamRes?.data?.length > 0) {
      onChange(teamRes?.data[0]?.id);
    }
  }, [teamRes, value]);
  if (isError) {
    return <Text>{translations["Something went wrong!"]}</Text>;
  }
  if (teamsLoading) {
    return (
      <Card h={46} w={240} radius={"md"} withBorder p={0}>
        <Group justify="space-between" w={"100%"} my={"auto"}>
          <Skeleton w={100} h={20} ml={"xs"} />
          <Skeleton w={20} h={20} mr={"xs"} />
        </Group>
      </Card>
    );
  }
  const teams = teamRes?.data;
  if (!teams) {
    return <Text>{translations["No teams found!"]}</Text>;
  }
  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
  }));
  if (enableAll)
    teamOptions.unshift({ value: "all", label: translations["All Teams"] });

  return (
    <ContainedSelection
      allowDeselect={false}
      data={teamOptions}
      defaultValue={teamOptions[0].value}
      onChange={onChange}
      label={label}
      {...props}
    />
  );
}
