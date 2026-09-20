// Extracted verbatim from the `/dashboard/settings/team/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronRight, IconPlus, IconRefresh, IconUsers } from "@tabler/icons-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { useAllTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useCreateTeamMutation, useTeamsByUser } from "@/backend/team/team.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { ColorField } from "@/components/common/color-field.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { DEFAULT_TEAM_COLOR } from "@/components/settings/team.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { HEX_COLOR } from "@/utils/color.ts";

export function TeamPage() {
  const uid = useId();
  const { data: orgMembers } = useAllTeamsMembersOfOrg();
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const action = searchParams?.action;
  // Opening a team to look at who is in it is nobody's privilege — a member needs to know who
  // they can hand a chat to. Creating one is `teams.manage`.
  const canManageTeams = usePermissions().can("teams.manage");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    refetch: refetchTeams,
  } = useTeamsByUser();
  const createTeamSchema = z.object({
    name: z.string().min(3, translations("Team Name should be at least 3 characters long")),
    code: z.string().superRefine((value, ctx) => {
      if (value.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: translations("Team Code should be at least 2 characters long"),
        });
        return;
      }

      if (/\s/.test(value)) {
        const suggested = value.trim().replace(/\s+/g, "-");
        ctx.addIssue({
          code: "custom",
          message: `${translations("Spaces are not allowed, try")} "${suggested}"`,
        });
        return;
      }

      if (!/^[A-Za-z0-9-]+$/.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: translations("Team Code can contain only alphabets, numbers, and hyphens"),
        });
      }
    }),
    // The picker takes typed input, so an unparseable hex can reach here and would render
    // the team's card transparent.
    color: z.string().regex(HEX_COLOR, translations("Use a hex colour like #5A8CC6")),
  });

  type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      code: "",
      // `?action=create` opens the dialog without running the button's reset, so the colour
      // needs a default here.
      color: DEFAULT_TEAM_COLOR,
    },
  });

  const createTeamMutation = useCreateTeamMutation(
    setIsCreateTeamDialogOpen,
    createTeamForm,
    setIsCreating,
  );

  const handleSubmit = async (values: CreateTeamFormValues) => {
    setIsCreating(true);
    toast.loading(
      `${translations("Hold on, Your team")} '${values?.name}' ${translations("is getting created.")}`,
      {
        id: "load-data",
      },
    );
    createTeamMutation.mutate(values);
  };
  useEffect(() => {
    if (action === "create") {
      setIsCreateTeamDialogOpen(true);
    }
  }, [action]);

  /**
   * team id -> its members, inverted from the org members list. The teams endpoint returns
   * only `_count.members`, so this is where names come from without a request per team.
   */
  const membersByTeam = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const member of orgMembers?.data?.members ?? []) {
      for (const team of member.teams ?? []) {
        const teamId = team.id ?? team.team_id ?? team.teamId;
        if (!teamId) continue;
        map.set(teamId, [
          ...(map.get(teamId) ?? []),
          { id: member.id ?? "", name: member.name ?? "" },
        ]);
      }
    }
    return map;
  }, [orgMembers]);

  const membersOfTeam = (teamId: string) => membersByTeam.get(teamId) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-2xl">{translations("Team Management")}</h2>
            <Button
              disabled={isLoadingTeamsUser}
              variant="outline"
              onClick={() => void refetchTeams()}
              className="flex items-center justify-center gap-1"
            >
              <IconRefresh />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {translations("Organize members into teams and manage roles")}
          </p>
        </div>

        {canManageTeams && (
          <Button
            className="bg-primary hover:shadow-lg transition-all"
            onClick={() => {
              createTeamForm.reset({
                name: "",
                code: "",
                color: DEFAULT_TEAM_COLOR,
              });

              setIsCreateTeamDialogOpen(true);
            }}
          >
            <IconPlus className="w-4 h-4" />
            {translations("Create Team")}
          </Button>
        )}
      </div>
      {/* Teams Grid with Skeletons */}
      <CardGrid
        items={teamsData?.data ?? []}
        getKey={(team) => team.id}
        renderItem={(team) => (
          <ActionCard
            onClick={() => {
              navigate({
                to: `/dashboard/settings/team/${team.id}`,
              });
            }}
            title={
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: team.color || "#7F77DD" }}
                >
                  <IconUsers className="w-[17px] h-[17px] text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">{team.name}</span>
                    <span className="text-[11px] font-medium border rounded-full px-1.5 py-0.5 text-muted-foreground bg-muted">
                      {team.code}
                    </span>
                  </div>
                </div>
              </div>
            }
            footerLeft={
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center">
                  {/* Real initials. This stack used to be `Array.from({ length: count })`
                        of identical generic icons — it looked like it was telling you who
                        was in the team while telling you nothing. */}
                  <div className="flex">
                    {membersOfTeam(team.id)
                      .slice(0, 3)
                      .map((member) => (
                        <span
                          key={member.id}
                          title={member.name}
                          className="-ml-1.5 flex size-[26px] items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium text-foreground first:ml-0"
                        >
                          {member.name?.toUpperCase().slice(0, 2)}
                        </span>
                      ))}
                    {team._count.members > 3 && (
                      <span className="-ml-1.5 flex size-[26px] items-center justify-center rounded-full border-2 border-background bg-muted">
                        <span className="text-[9px] font-medium text-muted-foreground">
                          +{team._count.members - 3}
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {team._count.members === 0
                      ? translations("No one yet")
                      : `${team._count.members} ${
                          team._count.members === 1
                            ? translations("member")
                            : translations("members")
                        }`}
                  </span>
                </div>
                <IconChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            }
          />
        )}
      />
      {/* create team */}
      {canManageTeams && (
        <Dialog
          open={isCreateTeamDialogOpen}
          onOpenChange={(open) => {
            setIsCreateTeamDialogOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                {translations(
                  "Organize your team members into groups for better collaboration and management",
                )}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createTeamForm.handleSubmit(handleSubmit)}>
              <div className="flex flex-col gap-4 py-4">
                <Controller
                  name="name"
                  control={createTeamForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{translations("Team Name")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g., Customer Support Team"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="code"
                  control={createTeamForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{translations("Team Code")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g., TEAM"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="color"
                  control={createTeamForm.control}
                  render={({ field }) => (
                    <ColorField
                      id={`${uid}-team-color`}
                      label={translations("Team Color")}
                      value={String(field.value ?? "")}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating} className="bg-primary">
                  {isCreating ? translations("Creating") : translations("Create Team")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
