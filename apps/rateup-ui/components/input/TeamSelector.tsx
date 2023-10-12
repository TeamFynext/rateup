import { SelectProps, Loader, Select, Text } from "@mantine/core";
import { useEffect } from "react";
import { useTeamsByUser } from "../../backend/team/team.query";

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
  } = useTeamsByUser(undefined, null);

  useEffect(() => {
    // Setting the default teamId to the first team in the list
    if (teamRes?.data?.data?.length > 0 && !value) {
      onChange(teamRes?.data?.data[0]?.teamId);
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
  const teams = teamRes?.data?.data;
  if (!teams) {
    return <Text>No teams found!</Text>;
  }
  const teamOptions = teams.map((team) => ({
    value: team.teamId,
    label: team.teamName,
  }));
  if (enableAll) teamOptions.unshift({ value: "all", label: "All Teams" });

  return (
    <Select
      data={teamOptions}
      defaultValue={teamOptions[0].value}
      onChange={onChange}
      label={label}
      {...props}
    />
  );
}
