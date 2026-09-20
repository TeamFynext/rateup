import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconPlus,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconMailPlus,
  IconUserX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { teamKeys } from "@/backend/org/org.keys";
import { inviteTeamMember } from "@/backend/team/team.api";
import {
  useAddUsertoTeams,
  useDeleteInviteMutation,
  useDeleteTeamMutation,
  useEditTeamMutation,
  useNotTeamMembers,
  useRemoveUserFromTeam,
  useTeamChannels,
  useTeamMembersFromInvitation,
  useUpdateTeamChannels,
} from "@/backend/team/team.query";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { ColorField } from "@/components/common/color-field.tsx";
import { RoleBadge } from "@/components/common/RoleBadge.tsx";
import { RoleSelect } from "@/components/common/RoleSelect.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { resolveRoleKey } from "@/utils/authz/can.ts";
import { roleKeyToLegacy, type RoleKey } from "@/utils/authz/roles.ts";
import { HEX_COLOR } from "@/utils/color.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { Card, CardContent } from "../ui/card.tsx";

/** What a team is coloured when nobody chooses. */
export const DEFAULT_TEAM_COLOR = "#5a8cc6";

/** The team row the settings panels operate on. */
interface SelectedTeam {
  id: string;
  name?: string;
  code?: string;
  color?: string;
  createdAt?: string;
}

export function EditTeam({ selectedTeam }: { selectedTeam: SelectedTeam }) {
  const { t: translations } = useTranslation();

  const id = selectedTeam.id;
  const [isLoading, setIsLoading] = useState(false);
  const editTeam = useEditTeamMutation(id, setIsLoading);
  // The Google review link is on the team row, but only the members endpoint returns it.
  const { data: teamsMembersData } = useTeamMembersFromInvitation(id);

  const form = useForm({
    defaultValues: {
      name: "",
      code: "",
      color: "",
      googleLink: "",
    },
  });

  useEffect(() => {
    if (selectedTeam) {
      form.reset({
        name: selectedTeam.name || "",
        code: selectedTeam.code || "",
        color: selectedTeam.color || DEFAULT_TEAM_COLOR,
        googleLink: teamsMembersData?.googleLink || "",
      });
    }
  }, [selectedTeam, teamsMembersData?.googleLink]);

  const onSubmit = (values: {
    name: string;
    code?: string;
    color?: string;
    googleLink?: string;
  }) => {
    setIsLoading(true);

    const data = {
      name: values.name?.trim(),
      code: values.code?.trim(),
      color: values.color?.trim(),
      googleLink: values.googleLink?.trim(),
    };

    editTeam.mutate(data, {
      onSuccess: () => {
        setIsLoading(false);
      },
    });
  };
  return (
    <Card className="p-4">
      <div>
        <h2 className="text-xl">{translations("Team Settings")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Configure team details and preferences")}
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Team Name */}
        <Controller
          name="name"
          control={form.control}
          rules={{
            validate: (value) =>
              value.length >= 3 || translations("Team Name should be at least 3 characters long"),
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="team-name">{translations("Team Name")}</FieldLabel>
              <Input
                {...field}
                id="team-name"
                placeholder={translations("Enter Team name")}
                aria-invalid={fieldState.invalid}
                className="h-10"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Team Code */}
        <Controller
          name="code"
          control={form.control}
          rules={{
            validate: (value) => {
              if (value.length < 2) {
                return translations("Team Code should be at least 2 characters long");
              }

              if (/\s/.test(value)) {
                const suggested = value.trim().replaceAll(/\s+/g, "-");
                return `${translations("Spaces not allowed, try")} "${suggested}"`;
              }

              if (!/^[A-Za-z0-9-]+$/.test(value)) {
                return translations("Team Code can contain only alphabets, numbers, and hyphens");
              }

              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="team-code">{translations("Team Code")}</FieldLabel>
              <Input
                {...field}
                id="team-code"
                placeholder={translations("Enter Team code")}
                aria-invalid={fieldState.invalid}
                className="h-10"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Team Color */}
        <Controller
          name="color"
          control={form.control}
          rules={{
            // An unparseable colour renders the team's card transparent, not an error.
            validate: (value) =>
              HEX_COLOR.test(String(value ?? "")) || translations("Use a hex colour like #5A8CC6"),
          }}
          render={({ field, fieldState }) => (
            <ColorField
              id="team-color"
              label={translations("Team Color")}
              value={String(field.value ?? "")}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hint={translations("Shown on the team's card and next to its name.")}
              invalid={fieldState.invalid}
              error={fieldState.error}
            />
          )}
        />

        <Controller
          name="googleLink"
          control={form.control}
          rules={{
            validate: (value) =>
              !value ||
              value.startsWith("https://") ||
              translations("Please enter a valid url (https://...)"),
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="google-link">{translations("Google review link")}</FieldLabel>
              <Input
                {...field}
                id="google-link"
                placeholder={translations("Enter google link")}
                aria-invalid={fieldState.invalid}
                className="h-10"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Submit */}
        <div className="flex items-end justify-end pt-2">
          <Button type="submit" loading={isLoading} className="bg-primary">
            {translations("Save Changes")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * `canManage` false is the read-only roster a plain member gets. The add/remove endpoints are
 * owner/admin-only, so the "not in this team yet" query is skipped rather than left to 403.
 */
export function AddMembers({
  selectedTeam,
  canManage = true,
}: {
  selectedTeam: string;
  canManage?: boolean;
}) {
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name?: string;
    isInvitation?: boolean;
  } | null>(null);
  const { t: translations } = useTranslation();
  // Only roles inside the inviter's own may be handed out; the API refuses anything else.
  const { grantableRoles } = usePermissions();
  const teamID = selectedTeam;
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { isLoading: isLoadingNotTeamsUser, data: notTeamMembersData } = useNotTeamMembers(
    canManage ? teamID : "",
  );
  const queryClient = useQueryClient();
  const removeteam = useRemoveUserFromTeam(selectedTeam);
  const deleteInvite = useDeleteInviteMutation(selectedTeam);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // "Add existing user" moves an existing account into the team; "Invite new user" emails
  // someone without one a link to create it.
  const inviteForm = useForm<{ name: string; email: string; role: RoleKey | "" }>({
    defaultValues: { name: "", email: "", role: "STAFF" },
  });

  const inviteNewUser = useMutation({
    mutationFn: async (values: { name: string; email: string; role: RoleKey | "" }) => {
      // The org and the inviter come from the session on the server.
      return (
        await inviteTeamMember({
          name: values.name.trim(),
          email: values.email.trim(),
          teamId: selectedTeam,
          type: "TEAM",
          role: roleKeyToLegacy(values.role || "STAFF"),
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitedByTeam(selectedTeam) });
      queryClient.invalidateQueries({ queryKey: teamKeys.notMembers() });
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      toast.success(translations("Invite sent successfully."));
      inviteForm.reset();
      setIsInviteOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || translations("An error occurred"));
    },
  });

  const removeTeam = (userid: string) => {
    removeteam.mutate(
      { teamId: selectedTeam, userId: userid },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: teamKeys.invited() });
          queryClient.invalidateQueries({ queryKey: teamKeys.notMembers() });
          queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
        },
      },
    );
  };

  const { isLoading: isLoadingMembers, data: teamsMembersData } =
    useTeamMembersFromInvitation(teamID);
  const addTeams = useAddUsertoTeams();

  /**
   * Members and unaccepted invitations in one list. The flag keeps them apart in the row: an
   * invitation has no role, photo or join date, and removing it deletes the invite.
   */
  const teamMembersObjArr: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    roleKey?: string;
    profilePhoto?: string;
    createdAt?: string;
    isInvitation?: boolean;
  }[] = [
    ...(teamsMembersData?.invitations || []).map((invite: { id?: string }) => ({
      ...invite,
      isInvitation: true,
    })),
    ...(teamsMembersData?.members || []),
  ];

  let addTeamMembersContent: React.ReactNode;
  if (isLoadingNotTeamsUser) {
    addTeamMembersContent = (
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="w-full py-2 rounded-lg flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-2 flex-1">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    );
  } else if (notTeamMembersData?.data?.length) {
    addTeamMembersContent = (
      <div className="space-y-1">
        {notTeamMembersData?.data?.map(
          (user: { id: string; name?: string; email?: string; profilePhoto?: string }) => (
            <div
              key={user.id}
              className="w-full py-2 rounded-lg flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getFileUrlFromKey(user?.profilePhoto ?? "")} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name?.toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  addTeams.mutate({
                    userId: user.id,
                    teamIds: [selectedTeam],
                    userEmail: user.email ?? "",
                  })
                }
              >
                <IconPlus className="w-3 h-3 mr-1" />
                {translations("Add")}
              </Button>
            </div>
          ),
        )}
      </div>
    );
  } else {
    addTeamMembersContent = (
      <div className="text-center py-6 text-muted-foreground">
        {translations("All users are already in this team")}
      </div>
    );
  }

  // The same table the workspace-wide People list uses (`users/parts/PeopleList.tsx`).
  let membersGridContent: React.ReactNode;
  if (isLoadingMembers) {
    membersGridContent = (
      <div className="flex flex-col divide-y divide-border">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="hidden h-3 w-28 sm:block" />
          </div>
        ))}
      </div>
    );
  } else if (teamMembersObjArr?.length) {
    membersGridContent = (
      <div className="flex flex-col">
        <div className="hidden gap-4 border-b border-border pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
          <span className="flex-1">{translations("Person")}</span>
          <span className="w-32">{translations("Role")}</span>
          <span className="w-40">{translations("Joined")}</span>
          <span className="w-20 text-right">{translations("Actions")}</span>
        </div>

        <div className="flex flex-col divide-y divide-border">
          {teamMembersObjArr.map((member) => {
            const isInvitation = Boolean(member?.isInvitation);
            const joinedAt = member?.createdAt ? dayjs(member.createdAt).format("MMM D, YYYY") : "";

            return (
              <div
                key={member?.id}
                className={cn(
                  "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4",
                  isInvitation && "opacity-90",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isInvitation ? (
                    // A dashed ring says "not here yet".
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                      {member.name?.toUpperCase().slice(0, 2)}
                    </span>
                  ) : (
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={getFileUrlFromKey(member?.profilePhoto ?? "")} />
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {member.name?.toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        isInvitation && "text-muted-foreground",
                      )}
                    >
                      {member.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {member.phone ? `${member.email} · ${member.phone}` : member.email}
                    </span>
                  </div>
                </div>

                <div className="sm:w-32">
                  {(() => {
                    if (isInvitation) {
                      return (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal text-muted-foreground"
                        >
                          {translations("Invited")}
                        </Badge>
                      );
                    }

                    return <RoleBadge roleKey={member?.roleKey} role={member?.role} size="sm" />;
                  })()}
                </div>

                <div className="text-xs text-muted-foreground sm:w-40">
                  {(() => {
                    if (!joinedAt) return "—";
                    return isInvitation ? `${translations("Invited")} ${joinedAt}` : joinedAt;
                  })()}
                </div>

                <div className="flex sm:w-20 sm:justify-end">
                  {canManage &&
                    resolveRoleKey({ roleKey: member?.roleKey, role: member?.role }) !==
                      "OWNER" && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={
                                isInvitation
                                  ? translations("Delete invite")
                                  : translations("Remove Member")
                              }
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setMemberToDelete(member as { id: string })}
                            />
                          }
                        >
                          {isInvitation ? (
                            <IconTrash className="size-4" />
                          ) : (
                            <IconUserX className="size-4" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {isInvitation
                            ? translations("Delete invite")
                            : translations("Remove Member")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    membersGridContent = (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <IconUsers className="w-12 h-12 opacity-30" />
        <p>{translations("No members in this team yet")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{translations("Team Members")}</h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? translations("Manage who has access to this team")
              : translations("People who have access to this team")}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger render={<Button variant="outline" />}>
                <IconUserPlus className="w-4 h-4 mr-2" />
                {translations("Add existing user")}
              </DialogTrigger>

              <DialogContent className="p-4">
                <div className="space-y-3">
                  <DialogHeader>
                    <DialogTitle>{translations("Add existing user")}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {translations("People who already have an account but are not in this team.")}
                    </DialogDescription>
                  </DialogHeader>

                  <Separator />

                  <ScrollArea className="h-60">{addTeamMembersContent}</ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isInviteOpen}
              onOpenChange={(open) => {
                setIsInviteOpen(open);
                if (!open) inviteForm.reset();
              }}
            >
              <DialogTrigger render={<Button />}>
                <IconMailPlus className="w-4 h-4 mr-2" />
                {translations("Invite new user")}
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{translations("Invite new user")}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {translations("They will join this team as soon as they accept.")}
                  </DialogDescription>
                </DialogHeader>

                <form
                  className="flex flex-col gap-4"
                  onSubmit={inviteForm.handleSubmit((values) => inviteNewUser.mutate(values))}
                >
                  <Controller
                    control={inviteForm.control}
                    name="name"
                    rules={{
                      required: translations("Name is required"),
                      minLength: { value: 2, message: translations("Invalid name.") },
                    }}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="invite-name">{translations("Name")}</FieldLabel>
                        <Input
                          id="invite-name"
                          autoComplete="off"
                          placeholder={translations("Name")}
                          {...field}
                        />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </Field>
                    )}
                  />

                  <Controller
                    control={inviteForm.control}
                    name="email"
                    rules={{
                      required: translations("Email is required"),
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: translations("Please enter a valid email address"),
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor="invite-email">{translations("Email")}</FieldLabel>
                        <Input
                          id="invite-email"
                          type="email"
                          autoComplete="off"
                          placeholder="name@company.com"
                          {...field}
                        />
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </Field>
                    )}
                  />

                  <Field>
                    <FieldLabel htmlFor="invite-role">{translations("Role")}</FieldLabel>
                    <RoleSelect
                      id="invite-role"
                      className="w-full"
                      value={inviteForm.watch("role")}
                      grantable={grantableRoles}
                      onChange={(role) => inviteForm.setValue("role", role)}
                    />
                  </Field>

                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <IconMail className="mt-0.5 size-3.5 shrink-0" />
                    {translations("We'll email an invite link so they can set their own password.")}
                  </p>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                      loading={inviteNewUser.isPending}
                    >
                      {translations("Cancel")}
                    </Button>

                    <Button type="submit" loading={inviteNewUser.isPending}>
                      {translations("Send invite")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      {/* Members list */}
      <ScrollArea className="h-[calc(100vh-275px)] min-h-64">
        <div className="px-1">{membersGridContent}</div>
      </ScrollArea>
      <Dialog
        open={!!memberToDelete}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {memberToDelete?.isInvitation
                ? translations("Delete invite")
                : translations("Remove Member")}
            </DialogTitle>
            <DialogDescription>
              {memberToDelete?.isInvitation
                ? translations(
                    "This invitation will stop working. You can always invite them again.",
                  )
                : translations("Are you sure you want to remove")}
              {""}
              <span className="font-semibold">{memberToDelete?.name}</span>
              {""}
              {!memberToDelete?.isInvitation && translations("from this team?")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setMemberToDelete(null)}>
              {translations("Cancel")}
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                // An invitation names no user yet, so remove-from-team has nothing to act on.
                if (memberToDelete?.isInvitation) {
                  deleteInvite.mutate(memberToDelete.id);
                } else {
                  removeTeam(memberToDelete?.id ?? "");
                }
                setMemberToDelete(null);
              }}
            >
              {memberToDelete?.isInvitation ? translations("Delete") : translations("Remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeleteTeam({ selectedTeam }: { selectedTeam: SelectedTeam }) {
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const teamId = selectedTeam.id;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteTeamMutation = useDeleteTeamMutation();

  const handleDeleteTeam = async (deleteTeamId: string) => {
    setIsDeleting(true);
    toast.loading(translations("Hold on, Your team is getting deleted"), {
      id: "load-data",
    });

    deleteTeamMutation.mutate(deleteTeamId, {
      onSuccess: () => {
        setIsDeleting(false);
        setIsDialogOpen(false);
        navigate({
          to: "/dashboard/settings/team",
        });
      },
    });
  };

  return (
    <>
      {/* DELETE SECTION */}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-destructive">{translations("Delete Team")}</p>
          <p className="text-xs text-muted-foreground">
            {translations(
              "Permanently delete this team? Team members will remain in your organization",
            )}
            .
          </p>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => setIsDialogOpen(true)}
        >
          <IconTrash className="w-3.5 h-3.5 mr-1.5" />
          {translations("Delete Team")}
        </Button>
      </div>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm border-destructive/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <IconTrash className="h-5 w-5 text-destructive" />
              {translations("Confirm Deletion")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {translations("This action")} <strong>{translations("cannot be undone")}.</strong>
              {""}
              {translations("Are you sure you want to permanently delete this team")}?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} loading={isDeleting}>
              {translations("Cancel")}
            </Button>

            <Button
              variant="destructive"
              onClick={() => handleDeleteTeam(teamId)}
              loading={isDeleting}
            >
              {isDeleting ? translations("Deleting") : translations("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** How long after the last switch flip the section saves itself. */
const AUTOSAVE_DELAY_MS = 700;
/** How long "Saved" stays up before the section goes quiet again. */
const SAVED_LABEL_MS = 2000;

type AutosaveStatus = "idle" | "saving" | "saved";

/**
 * Debounced autosave for a section with no Save button. `draft` is `null` until the user
 * touches something; every new draft restarts the timer, so four flipped switches are one
 * request and none can land out of order. `save` reports back through `done(ok)`.
 */
function useAutosave<T>(draft: T | null, save: (draft: T, done: (ok: boolean) => void) => void) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  // `save` is a new function every render; in the deps it would reschedule the timer forever.
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (draft === null) return;
    setStatus("saving");
    const timer = setTimeout(() => {
      saveRef.current(draft, (ok) => setStatus(ok ? "saved" : "idle"));
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = setTimeout(() => setStatus("idle"), SAVED_LABEL_MS);
    return () => clearTimeout(timer);
  }, [status]);

  return status;
}

/** Stands in for the Save button: what the section is doing with your changes. */
function AutosaveStatusLabel({ status }: Readonly<{ status: AutosaveStatus }>) {
  const { t: translations } = useTranslation();

  if (status === "idle") return null;

  return (
    <span
      aria-live="polite"
      className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
    >
      {status === "saving" ? (
        <>
          <IconLoader2 className="size-3.5 animate-spin" />
          {translations("Saving")}
        </>
      ) : (
        <>
          <IconCheck className="size-3.5" />
          {translations("Saved")}
        </>
      )}
    </span>
  );
}

/** Best available human-readable name for a channel, with the platform it belongs to. */
function describeChannel(channel: WaSettings[number]): { label: string; platform: string } {
  if (channel?.ibaId) {
    return {
      label: channel.igDisplayName || channel.igUserName || channel.ibaId,
      platform: "Instagram",
    };
  }
  if (channel?.fbPageId) {
    return { label: channel.fbUserName || channel.fbPageId, platform: "Facebook" };
  }
  return {
    label: channel?.phoneDisplayName || channel?.phone || channel?.phoneId || "Unnamed channel",
    platform: "WhatsApp",
  };
}

export function TeamChannelAccess({ selectedTeam }: { selectedTeam: SelectedTeam }) {
  const { t: translations } = useTranslation();
  const teamId = selectedTeam?.id as string;

  const { data, isLoading } = useTeamChannels(teamId);
  const { data: allChannelsList, isLoading: isLoadingChannels } = useWaSettings();
  const updateMutation = useUpdateTeamChannels(teamId);

  // `null` means "untouched" — the server's value is shown until then.
  const [draft, setDraft] = useState<{ allChannels: boolean; ids: Set<string> } | null>(null);

  const serverState = useMemo(
    () => ({
      allChannels: data?.allChannels ?? true,
      ids: new Set<string>((data?.channels ?? []).map((c) => c.id)),
    }),
    [data],
  );

  const current = draft ?? serverState;

  const toggleChannel = (channelId: string) => {
    const ids = new Set(current.ids);
    if (ids.has(channelId)) ids.delete(channelId);
    else ids.add(channelId);
    setDraft({ allChannels: false, ids });
  };

  const status = useAutosave(draft, (value, done) => {
    updateMutation.mutate(
      { allChannels: value.allChannels, channelIds: Array.from(value.ids) },
      {
        onSuccess: () => {
          // See TeamFeatureAccess: clear the draft only while it is still the saved one.
          setDraft((previous) => (previous === value ? null : previous));
          done(true);
        },
        onError: () => {
          setDraft(null);
          done(false);
        },
      },
    );
  });

  if (isLoading || isLoadingChannels) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={`chan-skel-${i}`} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const channels = allChannelsList ?? [];
  const hasNoGrant = !current.allChannels && current.ids.size === 0;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl mb-1">{translations("Channel Access")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations(
              "Choose which channels this team can see. Changes save on their own. Org owners always see every channel.",
            )}
          </p>
        </div>
        <AutosaveStatusLabel status={status} />
      </div>

      {/* "All channels" is the mode control; the list below it stays visible while it is on,
          checked and dimmed, so what "all" covers can still be read. */}
      <Card size="sm" className="py-0">
        <CardContent className="divide-y divide-border px-0">
          <label
            htmlFor="team-all-channels"
            className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{translations("All channels")}</p>
              <p className="text-xs text-muted-foreground">
                {translations("Includes any channel connected in the future.")}
              </p>
            </div>
            <Switch
              id="team-all-channels"
              checked={current.allChannels}
              onCheckedChange={(checked) =>
                setDraft({ allChannels: checked, ids: checked ? new Set() : current.ids })
              }
            />
          </label>

          {channels.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {translations("No channels are connected to this organisation yet.")}
            </p>
          ) : (
            channels.map((channel) => {
              const { label, platform } = describeChannel(channel);

              return (
                <label
                  key={channel.id}
                  htmlFor={`team-channel-${channel.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm",
                    current.allChannels ? "opacity-60" : "cursor-pointer",
                  )}
                >
                  <Checkbox
                    id={`team-channel-${channel.id}`}
                    checked={current.allChannels || current.ids.has(channel.id)}
                    disabled={current.allChannels}
                    onCheckedChange={() => toggleChannel(channel.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{platform}</span>
                </label>
              );
            })
          )}

          {hasNoGrant && (
            <p className="px-4 py-3 text-sm text-destructive">
              {translations(
                "No channels selected — members of this team will not see any channel.",
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
