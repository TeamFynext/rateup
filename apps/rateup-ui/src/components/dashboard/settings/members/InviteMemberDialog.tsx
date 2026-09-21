import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconMail } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { orgKeys, teamKeys } from "@/backend/org/org.keys";
import { inviteTeamMember } from "@/backend/team/team.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { PERMISSION_LABELS } from "@/utils/authz/permissions.ts";
import { ROLE_META, ROLE_TEAM_SCOPE, roleKeyToLegacy, type RoleKey } from "@/utils/authz/roles.ts";

import { roleDiff } from "./roleDiff.ts";
import type { TeamOption } from "./types.ts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamOption[];
  /** Roles the signed-in user may hand out; the picker shows nothing else. */
  grantableRoles: readonly RoleKey[];
}

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  roleKey: z.enum(["ADMIN", "MANAGER", "STAFF", "AGENT", "VIEWER"]),
  teamIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

/** The three abilities that best say what a role adds over the one below it. */
function highlights(roleKey: RoleKey): string[] {
  const ladder: RoleKey[] = ["VIEWER", "AGENT", "STAFF", "MANAGER", "ADMIN"];
  const below = ladder[ladder.indexOf(roleKey) - 1];
  const { gains } = roleDiff(below, roleKey);
  return gains.slice(0, 3).map((p) => PERMISSION_LABELS[p]);
}

export function InviteMemberDialog({ open, onOpenChange, teams, grantableRoles }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const defaultRole: RoleKey = grantableRoles.includes("STAFF")
    ? "STAFF"
    : (grantableRoles[0] ?? "STAFF");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      roleKey: defaultRole as FormValues["roleKey"],
      teamIds: [],
    },
  });
  const roleKey = form.watch("roleKey");
  const teamIds = form.watch("teamIds");
  const teamScoped = ROLE_TEAM_SCOPE[roleKey] === "OWN_TEAMS";

  // A team-scoped person with no team would sign in and see nothing; start them in the first one.
  useEffect(() => {
    if (open && teams.length > 0 && form.getValues("teamIds").length === 0) {
      form.setValue("teamIds", [teams[0].id]);
    }
  }, [open, teams]);

  const invite = useMutation({
    mutationFn: async (values: FormValues) =>
      (
        await inviteTeamMember({
          name: values.name,
          email: values.email,
          teamId: values.teamIds[0] ?? null,
          teamIds: values.teamIds,
          type: "TEAM",
          // The API still stores the legacy spelling; the mapping is the same one it applies.
          role: roleKeyToLegacy(values.roleKey),
        })
      ).data,
    onSuccess: (data: { existing?: boolean } | undefined) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      toast.success(data?.existing ? t("Added to the team") : t("Invite sent"));
      form.reset({
        name: "",
        email: "",
        roleKey: defaultRole as FormValues["roleKey"],
        teamIds: [],
      });
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("Could not send the invite"))),
  });

  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const teamMissing = teamScoped && teamIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("Invite someone")}</DialogTitle>
          <DialogDescription>
            {t("They get an email with a link to set their own password.")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) => {
            if (teamScoped && values.teamIds.length === 0) return;
            invite.mutate(values);
          })}
          className="flex flex-col gap-5"
        >
          <FieldGroup className="gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invite-name" className="text-xs">
                      {t("Name")}
                    </FieldLabel>
                    <Input id="invite-name" autoComplete="off" {...field} />
                    <FieldError errors={[fieldState.error]} className="text-xs" />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invite-email" className="text-xs">
                      {t("Email")}
                    </FieldLabel>
                    <Input
                      id="invite-email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@company.com"
                      {...field}
                    />
                    <FieldError errors={[fieldState.error]} className="text-xs" />
                  </Field>
                )}
              />
            </div>

            <Field className="gap-1.5">
              <FieldLabel className="text-xs">{t("Role")}</FieldLabel>
              <div role="radiogroup" aria-label={t("Role")} className="grid gap-2 sm:grid-cols-2">
                {grantableRoles.map((key) => {
                  const meta = ROLE_META[key];
                  const selected = roleKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => form.setValue("roleKey", key as FormValues["roleKey"])}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{t(meta.label)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {meta.teamScope === "ALL" ? t("Every team") : t("Their teams")}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">{t(meta.summary)}</span>
                      {selected && key !== "VIEWER" && (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {highlights(key).map((label) => (
                            <li
                              key={label}
                              className="flex items-center gap-1.5 text-xs text-foreground"
                            >
                              <IconCheck className="size-3 text-primary" aria-hidden="true" />
                              {t(label)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </Field>

            {teamScoped ? (
              <Field className="gap-1.5" data-invalid={teamMissing}>
                <FieldLabel htmlFor="invite-teams" className="text-xs">
                  {t("Teams")}
                </FieldLabel>
                <MultiSelect
                  options={teamOptions}
                  value={teamIds}
                  onValueChange={(value) => form.setValue("teamIds", value)}
                  className="w-full"
                  placeholder={t("Select teams")}
                  emptyIndicator={t("No teams found")}
                />
                {teamMissing && (
                  <p className="text-xs text-destructive">
                    {t("A {role} works inside teams. Pick at least one.", {
                      role: t(ROLE_META[roleKey].label),
                    })}
                  </p>
                )}
              </Field>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("An {role} reaches every team, so there is nothing to pick.", {
                  role: t(ROLE_META[roleKey].label),
                })}
              </p>
            )}

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <IconMail className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t("We'll email an invite link so they can set their own password.")}
            </p>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={invite.isPending || teamMissing}>
              {invite.isPending ? t("Inviting") : t("Send invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
