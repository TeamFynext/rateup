import { SelectProps, Loader, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTeamsByUser } from "../../backend/team/team.query";
import { ContainedSelection } from "./ContainedInput/ContainedInput";

interface TeamSelectorProps extends SelectProps {
  value: string;
  onChange: (teamId: string) => void;
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
  // TODO: add allowAll boolean prop to allow selecting all teams
  // TODO: remove some nesting on results of the query?
  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();

  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (value) return;
    if (enableAll) {
      onChange("all");
    } else if (teamRes?.data?.length > 0) {
      onChange(teamRes?.data[0]?.teamId);
    }
  }, [teamRes, value]);
  if (isError) {
    console.error(error);
    return <Text>Something went wrong!</Text>;
  }
  if (teamsLoading) {
    console.log("teamRes", teamRes);
    return <Loader />;
  }
  const teams = teamRes?.data;
  if (!teams) {
    return <Text>No teams found!</Text>;
  }
  const teamOptions = teams.map((team) => ({
    value: team.teamId,
    label: team.teamName,
  }));
  if (enableAll) teamOptions.unshift({ value: "all", label: "All Teams" });

  return (
    <ContainedSelection
      data={teamOptions}
      defaultValue={teamOptions[0].value}
      onChange={onChange}
      label={label}
      {...props}
    />
  );
}
