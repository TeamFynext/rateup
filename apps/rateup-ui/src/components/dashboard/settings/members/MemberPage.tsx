import { IconArrowLeft, IconCrown, IconLock, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { orgKeys } from "@/backend/org/org.keys";
import {
  useAllTeamsMembersOfOrg,
  useTransferOwnershipMutation,
  useUpdateMemberPermissionsMutation,
  useUpdateRoleMutation,
} from "@/backend/org/org.query";
import {
  useAddUsertoTeams,
  useRemoveUserFromTeam,
  useTeamsByUser,
} from "@/backend/team/team.query";
import { useUserInfo } from "@/backend/user/user.query";
import {
  useUpdateActiveStatusMutation,
  useUpdateMemberProfileMutation,
  useUpdateProfileMutation,
  useUpdateUserPause,
} from "@/backend/user/user.query";
import { RoleBadge } from "@/components/common/RoleBadge.tsx";
import { RoleSelect } from "@/components/common/RoleSelect.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { resolveRoleKey } from "@/utils/authz/can.ts";
import { PERMISSION_LABELS } from "@/utils/authz/permissions.ts";
import { ROLE_META, ROLE_TEAM_SCOPE, type RoleKey } from "@/utils/authz/roles.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { MemberActivity } from "./MemberActivity.tsx";
import { PermissionOverridesEditor } from "./PermissionOverridesEditor.tsx";
import { roleDiff } from "./roleDiff.ts";
import { teamIdOf, type MemberRow, type TeamOption } from "./types.ts";

interface Props {
  memberId: string;
}

// The titles the profile endpoint stores.
const TITLES = [
  { value: "MALE", label: "Mr" },
  { value: "FEMALE", label: "Mrs" },
  { value: "OTHER", label: "Mx" },
] as const;

/**
 * One person, on their own page: who they are, what they may do, where they work, and what
 * they have done. Everything a manager needs when someone asks "why can't I…".
 */
export function MemberPage({ memberId }: Readonly<Props>) {
  const navigate = useNavigate();
  const { data, isPending: membersPending } = useAllTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const { data: userInfo } = useUserInfo();
  const currentUserId = userInfo && "data" in userInfo ? userInfo.data.userId : "";
  const teams: TeamOption[] = teamsData?.data ?? [];
  const members: MemberRow[] = data?.data?.members ?? [];
  const member = members.find((row) => row.id === memberId) ?? null;

  if (membersPending) {
    return (
      <div className="mx-auto flex w-full max-w-265 flex-col gap-4 pt-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }
  if (!member) return <MemberMissing />;
  return (
    <MemberDetails
      member={member}
      teams={teams}
      currentUserId={currentUserId}
      navigate={navigate}
    />
  );
}

function MemberMissing() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col items-start gap-3 pt-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground hover:text-foreground"
        render={<Link to="/dashboard/settings/members" />}
      >
        <IconArrowLeft className="size-4" aria-hidden="true" />
        {t("Back to Members")}
      </Button>
      <p className="text-sm font-medium">{t("This person is not in your organisation")}</p>
      <p className="text-sm text-muted-foreground">
        {t("They may have been removed, or the link may be from another organisation.")}
      </p>
    </div>
  );
}

function MemberDetails({
  member,
  teams,
  currentUserId,
  navigate,
}: Readonly<{
  member: MemberRow;
  teams: TeamOption[];
  currentUserId: string;
  navigate: ReturnType<typeof useNavigate>;
}>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can, grantableRoles, roleKey: myRoleKey, permissions: myPermissions } = usePermissions();

  const updateRole = useUpdateRoleMutation();
  const addUserToTeams = useAddUsertoTeams();
  const removeUserFromTeam = useRemoveUserFromTeam("");
  const updatePause = useUpdateUserPause();
  const removeMember = useUpdateActiveStatusMutation();
  const updateProfile = useUpdateProfileMutation();
  const updateMemberProfile = useUpdateMemberProfileMutation();
  const transfer = useTransferOwnershipMutation();
  const updateOverrides = useUpdateMemberPermissionsMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey | "">("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);

  useEffect(() => {
    if (!member) return;
    setName(member.name ?? "");
    setPhone(member.phone ?? "");
    setTitle(member.gender ?? "");
    setRoleKey(resolveRoleKey(member) ?? "");
    setTeamIds((member.teams ?? []).map(teamIdOf).filter((id): id is string => Boolean(id)));
  }, [member]);

  const isSelf = member.id === currentUserId;
  const memberRole = resolveRoleKey(member);
  const isOwner = memberRole === "OWNER";
  const canEditProfile = isSelf || can("members.manage");
  const canChangeRole = can("members.manage_roles") && !isOwner && !isSelf;
  const canEditTeams = can("teams.manage_members") && !isOwner;
  const canPauseOrRemove = can("members.manage") && !isOwner && !isSelf;
  const canTransfer = myRoleKey === "OWNER" && !isSelf && !member.isPaused;
  const teamScoped = roleKey !== "" && ROLE_TEAM_SCOPE[roleKey] === "OWN_TEAMS";
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));

  const close = () => navigate({ to: "/dashboard/settings/members" });

  const changeRole = (next: RoleKey) => {
    const previous = roleKey || undefined;
    setRoleKey(next);
    const { gains, loses } = roleDiff(previous, next);
    updateRole.mutate(
      { memberId: member.id, body: { roleKey: next } },
      {
        onSuccess: () => {
          const parts = [
            gains.length ? t("gains {count}", { count: gains.length }) : null,
            loses.length ? t("loses {count}", { count: loses.length }) : null,
          ].filter(Boolean);
          if (parts.length)
            toast.message(
              t("{name} is now {role}", {
                name: member.name ?? t("This person"),
                role: t(ROLE_META[next].label),
              }),
              { description: parts.join(" · ") + " " + t("abilities") },
            );
        },
        onError: () => setRoleKey(previous ?? ""),
      },
    );
  };

  const changeTeams = async (next: string[]) => {
    const previous = teamIds;
    const added = next.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !next.includes(id));
    setTeamIds(next);
    if (!added.length && !removed.length) return;
    setIsUpdatingTeams(true);
    const tasks: Promise<unknown>[] = [];
    if (added.length) {
      tasks.push(
        addUserToTeams.mutateAsync({
          userId: member.id,
          teamIds: added,
          userEmail: member.email ?? "",
        }),
      );
    }
    for (const teamId of removed)
      tasks.push(removeUserFromTeam.mutateAsync({ teamId, userId: member.id }));
    const results = await Promise.allSettled(tasks);
    setIsUpdatingTeams(false);
    if (results.some((r) => r.status === "rejected")) {
      toast.error(t("Could not update teams"));
      setTeamIds(previous);
    } else {
      toast.success(t("Teams updated"));
    }
  };

  const saveProfile = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error(t("Name is required"));
    if (!title) return toast.error(t("Select a title"));
    if (phone && !isValidPhoneNumber(phone))
      return toast.error(t("Please enter a valid phone number"));
    const data = { title, name: trimmed, phone: phone || "" };
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      toast.success(t("Profile saved"));
    };
    const onError = (error: unknown) =>
      toast.error(getApiErrorMessage(error, t("Could not save the profile")));
    if (isSelf) updateProfile.mutate(data, { onSuccess, onError });
    else updateMemberProfile.mutate({ userId: member.id, data }, { onSuccess, onError });
  };

  const togglePause = () => {
    updatePause.mutate({
      userId: member.id,
      data: { isPaused: !member.isPaused, pausedBy: "org" },
    });
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("Remove {name}?", { name: member.name ?? member.email ?? "" }),
      description: t(
        "They lose access straight away. Their conversations and work stay with the organisation.",
      ),
      confirmText: t("Remove"),
      cancelText: t("Cancel"),
    });
    if (!ok) return;
    removeMember.mutate(
      { userId: member.id },
      {
        onSuccess: () => {
          toast.success(t("Removed"));
          close();
        },
        onError: (error) => toast.error(getApiErrorMessage(error, t("Could not remove them"))),
      },
    );
  };

  const handOver = async () => {
    const ok = await confirm({
      title: t("Make {name} the owner?", { name: member.name ?? member.email ?? "" }),
      description: t(
        "You stay an Admin. Only the owner can delete the organisation or hand it over again.",
      ),
      confirmText: t("Transfer ownership"),
      cancelText: t("Cancel"),
    });
    if (!ok) return;
    transfer.mutate(member.id, { onSuccess: close });
  };

  const initials = (member.name ?? member.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5 pt-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("Back to Members")}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          render={<Link to="/dashboard/settings/members" />}
        >
          <IconArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <Avatar className="size-12">
          <AvatarImage
            src={member.profilePhoto ? getFileUrlFromKey(member.profilePhoto) : undefined}
          />
          <AvatarFallback className="bg-primary text-sm text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl leading-tight font-semibold">
            {member.name || member.email}
          </h2>
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="block truncate text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              {member.email}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge roleKey={member.roleKey} role={member.role} />
          {isSelf && <Badge variant="outline">{t("You")}</Badge>}
          {member.isPaused && <Badge variant="destructive">{t("Paused")}</Badge>}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("Profile")}</TabsTrigger>
          <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="flex max-w-2xl flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("Role and access")}</CardTitle>
              <CardDescription>
                {t("What they may do, and which teams they can see it in.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Role */}
              <FieldGroup className="gap-2">
                <FieldLabel htmlFor="member-role" className="text-xs">
                  {t("Role")}
                </FieldLabel>
                {isOwner ? (
                  <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
                    <IconCrown
                      className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "The owner's role cannot be changed, and the owner cannot be paused or removed. Hand the organisation over first.",
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <RoleSelect
                      id="member-role"
                      value={roleKey}
                      grantable={grantableRoles}
                      disabled={!canChangeRole || updateRole.isPending}
                      onChange={changeRole}
                    />
                    {roleKey && (
                      <FieldDescription className="text-xs">
                        {t(ROLE_META[roleKey].summary)}
                        {!teamScoped && ` ${t("Reaches every team.")}`}
                      </FieldDescription>
                    )}
                    {!canChangeRole && !isSelf && (
                      <FieldDescription className="flex items-center gap-1.5 text-xs">
                        <IconLock className="size-3" aria-hidden="true" />
                        {t("Changing roles needs the Manage roles permission.")}
                      </FieldDescription>
                    )}
                  </>
                )}
              </FieldGroup>

              {/* Fine-tuning: shown to anyone who may change roles, read-only for the rest */}
              {roleKey &&
                !isOwner &&
                !isSelf &&
                (can("members.manage_roles") ||
                  (member.permissionGrants?.length ?? 0) + (member.permissionDenies?.length ?? 0) >
                    0) && (
                  <PermissionOverridesEditor
                    roleKey={roleKey}
                    grants={member.permissionGrants ?? []}
                    denies={member.permissionDenies ?? []}
                    editorPermissions={myPermissions}
                    disabled={!can("members.manage_roles")}
                    saving={updateOverrides.isPending}
                    onSave={(next) => updateOverrides.mutate({ memberId: member.id, body: next })}
                  />
                )}

              {/* Teams */}
              {teamScoped && (
                <FieldGroup className="gap-2">
                  <FieldLabel htmlFor="member-teams" className="text-xs">
                    {t("Teams")}
                  </FieldLabel>
                  <MultiSelect
                    options={teamOptions}
                    value={teamIds}
                    onValueChange={changeTeams}
                    disabled={!canEditTeams || isUpdatingTeams}
                    className="w-full"
                    placeholder={t("Select teams")}
                    emptyIndicator={t("No teams found")}
                  />
                  <FieldDescription className="text-xs">
                    {teamIds.length === 0
                      ? t("In no team: they can sign in but see no team's conversations.")
                      : t("Team changes are saved immediately.")}
                  </FieldDescription>
                </FieldGroup>
              )}

              {/* Why a permission exists, for the curious: the first three abilities this role has. */}
              {roleKey && !isOwner && (
                <p className="text-[11px] text-muted-foreground">
                  {t("Includes")}:{" "}
                  {roleDiff(undefined, roleKey)
                    .gains.slice(0, 3)
                    .map((p) => t(PERMISSION_LABELS[p]))
                    .join(" · ")}
                  …
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Profile")}</CardTitle>
              <CardDescription>{t("How this person appears to the team.")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile */}
              <FieldGroup className="gap-3">
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <Field className="gap-1.5" data-disabled={!canEditProfile}>
                    <FieldLabel htmlFor="member-title" className="text-xs">
                      {t("Title")}
                    </FieldLabel>
                    <Select
                      value={title || null}
                      disabled={!canEditProfile}
                      items={TITLES.map((item) => ({ value: item.value, label: t(item.label) }))}
                      onValueChange={(value) => setTitle(value ?? "")}
                    >
                      <SelectTrigger id="member-title" className="h-9">
                        <SelectValue placeholder={t("Title")} />
                      </SelectTrigger>
                      <SelectContent>
                        {TITLES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {t(item.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field className="gap-1.5" data-disabled={!canEditProfile}>
                    <FieldLabel htmlFor="member-name" className="text-xs">
                      {t("Name")}
                    </FieldLabel>
                    <Input
                      id="member-name"
                      value={name}
                      disabled={!canEditProfile}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9"
                    />
                  </Field>
                </div>
                <Field className="gap-1.5" data-disabled={!canEditProfile}>
                  <FieldLabel htmlFor="member-phone" className="text-xs">
                    {t("Phone Number")}
                  </FieldLabel>
                  <PhoneInput
                    id="member-phone"
                    className="h-9"
                    defaultCountry="IN"
                    value={phone}
                    disabled={!canEditProfile}
                    onChange={(value) => setPhone(value || "")}
                  />
                </Field>
                {canEditProfile && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={saveProfile}
                      disabled={updateProfile.isPending || updateMemberProfile.isPending}
                    >
                      {t("Save profile")}
                    </Button>
                  </div>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          {(canPauseOrRemove || canTransfer) && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Account")}</CardTitle>
                <CardDescription>
                  {t("Pause access, hand over the organisation, or remove this person.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {/* Account */}
                {canPauseOrRemove && (
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="member-active" className="text-xs font-normal">
                        {member.isPaused ? t("Paused") : t("Active")}
                      </FieldLabel>
                      <FieldDescription>
                        {t("A paused account cannot sign in until it is re-enabled.")}
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="member-active"
                      checked={!member.isPaused}
                      onCheckedChange={togglePause}
                      disabled={updatePause.isPending}
                    />
                  </Field>
                )}

                {canTransfer && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t("Transfer ownership")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("Make {name} the owner. You stay an Admin.", {
                          name: member.name ?? "",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handOver}
                      disabled={transfer.isPending}
                    >
                      <IconCrown className="size-4" aria-hidden="true" />
                      {t("Transfer")}
                    </Button>
                  </div>
                )}

                {canPauseOrRemove && (
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-destructive">
                        {t("Remove from organisation")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("They lose access straight away. This cannot be undone.")}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={remove}
                      disabled={removeMember.isPending}
                    >
                      <IconTrash className="size-4" aria-hidden="true" />
                      {t("Remove")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent>
              <MemberActivity memberId={member.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
