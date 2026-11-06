import { IconUsers } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useTeamsByUser } from "@/backend/team/team.query";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface TeamSelectorProps {
  className?: string;
  value?: string | null;
  onChange?: (teamId: string) => void;
  label?: React.ReactNode;
  enableAll?: boolean;
  enableDefaultValue?: boolean;
  placeholder?: string;
  error?: React.ReactNode;
  disabled?: boolean;
  name?: string;
  /** Extra props from legacy call sites (Mantine layout/select props) are ignored. */
  [key: string]: unknown;
}
export function TeamSelector({
  value,
  onChange,
  enableAll = false,
  enableDefaultValue = true,
  className,
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
      onChange?.("all");
    } else if (teamOptions.length > 0 && enableDefaultValue) {
      onChange?.(teamOptions[0]!.value);
    }
  }, [teamOptions, value]);

  if (isError) {
    return <p>{translations("Something went wrong!")}</p>;
  }
  if (teamsLoading) {
    return (
      // Same `className` as the trigger below, so the control does not change width once the
      // teams land — `w-60` is only the fallback for callers that pass no width.
      <Card className={cn("h-10 w-60 justify-center rounded-md border p-0", className)}>
        <div className="my-auto flex w-full items-center justify-between">
          <Skeleton className="ml-2 h-[17px] w-25" />
          <Skeleton className="mr-2 h-[17px] w-5" />
        </div>
      </Card>
    );
  }

  return (
    <Select value={value} onValueChange={(next) => onChange?.(next ?? "")} items={teamOptions}>
      <SelectTrigger className={cn(className)}>
        <div>
          <IconUsers className="size-4 text-muted-foreground" />
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
}
