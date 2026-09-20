import {
  IconCheck,
  IconCopy,
  IconMail,
  IconChevronRight,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconUserPlus,
  IconUserQuestion,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAllTeamsMembersOfOrg } from "@/backend/org/org.query";
import {
  useDeleteInviteMutation,
  userResendInviteTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import { useUserInfo } from "@/backend/user/user.query";
import { RoleBadge } from "@/components/common/RoleBadge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { resolveRoleKey } from "@/utils/authz/can.ts";
import { ROLE_META, type RoleKey } from "@/utils/authz/roles.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { InviteMemberDialog } from "./InviteMemberDialog.tsx";
import { ROLE_LADDER } from "./roleDiff.ts";
import {
  teamIdOf,
  type InvitationRow,
  type MemberRow,
  type MemberTeam,
  type TeamOption,
} from "./types.ts";

type StatusFilter = "all" | "unassigned" | "invited" | "paused";

/**
 * Everyone with access, as one table: people and their unaccepted invitations. Role and teams
 * are the two columns that matter, because a role says what someone may do and teams say where.
 */
export function MembersPage() {
  const { t } = useTranslation();
  const { can, grantableRoles } = usePermissions();
  const { data: userInfo } = useUserInfo();
  const currentUserId = userInfo && "data" in userInfo ? userInfo.data.userId : "";

  const { data, isPending } = useAllTeamsMembersOfOrg();
  const { data: teamsData } = useTeamsByUser();
  const teams: TeamOption[] = teamsData?.data ?? [];

  const members: MemberRow[] = data?.data?.members ?? [];
  const invitations: InvitationRow[] = data?.data?.invitations ?? [];

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleKey | "all">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resend = userResendInviteTeamMutation();
  const revoke = useDeleteInviteMutation("");

  const matches = (person: { name?: string; email?: string }) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      (person.name?.toLowerCase().includes(q) ?? false) ||
      (person.email?.toLowerCase().includes(q) ?? false)
    );
  };
  const inTeam = (list: MemberTeam[] | undefined) =>
    teamFilter === "all" || (list ?? []).some((team) => teamIdOf(team) === teamFilter);

  const visibleMembers = useMemo(
    () =>
      members.filter((member) => {
        if (!matches(member) || !inTeam(member.teams)) return false;
        if (roleFilter !== "all" && resolveRoleKey(member) !== roleFilter) return false;
        if (status === "unassigned") return (member.teams?.length ?? 0) === 0;
        if (status === "paused") return Boolean(member.isPaused);
        return status !== "invited";
      }),
    [members, search, roleFilter, teamFilter, status],
  );
  const visibleInvitations = useMemo(
    () =>
      status === "unassigned" || status === "paused"
        ? []
        : invitations.filter(
            (invite) =>
              matches(invite) &&
              inTeam(invite.teams) &&
              (roleFilter === "all" || resolveRoleKey(invite) === roleFilter),
          ),
    [invitations, search, roleFilter, teamFilter, status],
  );

  const unassignedCount = members.filter((member) => (member.teams?.length ?? 0) === 0).length;
  const pausedCount = members.filter((member) => member.isPaused).length;

  const copyInvite = async (id: string) => {
    await navigator.clipboard.writeText(
      `${import.meta.env.VITE_FRONTEND_URL}/invite?type=team&token=${id}`,
    );
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  const canEdit = (member: MemberRow) =>
    member.id === currentUserId ||
    can("members.manage") ||
    can("members.manage_roles") ||
    can("teams.manage_members");

  const toggle = (value: StatusFilter) =>
    setStatus((current) => (current === value ? "all" : value));

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mb-1 text-2xl">{t("Members")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Who can sign in, what they may do, and which teams they work in.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/dashboard/settings/members/roles" />}
          >
            <IconShieldCheck className="size-4" aria-hidden="true" />
            {t("Roles")}
          </Button>
          {can("members.invite") && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <IconUserPlus className="size-4" aria-hidden="true" />
              {t("Invite")}
            </Button>
          )}
        </div>
      </div>

      {/* Each count is a filter; a number you cannot act on is decoration. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <FilterWord active={status === "all"} onClick={() => setStatus("all")}>
          {t("{count} people", { count: members.length })}
        </FilterWord>
        {unassignedCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <FilterWord active={status === "unassigned"} onClick={() => toggle("unassigned")}>
              {t("{count} in no team", { count: unassignedCount })}
            </FilterWord>
          </>
        )}
        {invitations.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <FilterWord active={status === "invited"} onClick={() => toggle("invited")}>
              {t("{count} invited", { count: invitations.length })}
            </FilterWord>
          </>
        )}
        {pausedCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <FilterWord active={status === "paused"} onClick={() => toggle("paused")}>
              {t("{count} paused", { count: pausedCount })}
            </FilterWord>
          </>
        )}
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={t("Search by name or email")}
              className="h-9 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={roleFilter}
            items={[
              { value: "all", label: t("Every role") },
              ...ROLE_LADDER.map((key) => ({ value: key, label: t(ROLE_META[key].label) })),
            ]}
            onValueChange={(value) => setRoleFilter((value as RoleKey | "all" | null) ?? "all")}
          >
            <SelectTrigger className="h-9 sm:w-40" aria-label={t("Filter by role")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Every role")}</SelectItem>
              {ROLE_LADDER.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(ROLE_META[key].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={teamFilter}
            items={[
              { value: "all", label: t("Every team") },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
            onValueChange={(value) => setTeamFilter(value ?? "all")}
          >
            <SelectTrigger className="h-9 sm:w-44" aria-label={t("Filter by team")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Every team")}</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : visibleMembers.length === 0 && visibleInvitations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm font-medium">{t("No one matches")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Try another name, or clear the filters to see everyone.")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="hidden gap-4 border-b border-border pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
              <span className="flex-1">{t("Person")}</span>
              <span className="w-32">{t("Role")}</span>
              <span className="w-24">{t("Status")}</span>
              <span className="w-56">{t("Teams")}</span>
              <span className="w-24 text-right">{t("Actions")}</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {visibleMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Person
                    name={member.name}
                    email={member.email}
                    photo={member.profilePhoto}
                    you={member.id === currentUserId}
                  />
                  <span className="flex flex-wrap items-center gap-1 sm:w-32">
                    <RoleBadge roleKey={member.roleKey} role={member.role} size="sm" />
                    {((member.permissionGrants?.length ?? 0) > 0 ||
                      (member.permissionDenies?.length ?? 0) > 0) && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                        {t("Customised")}
                      </Badge>
                    )}
                  </span>
                  <span className="sm:w-24">
                    {member.isPaused ? (
                      <Badge variant="destructive">{t("Paused")}</Badge>
                    ) : (
                      <Presence status={member.status} />
                    )}
                  </span>
                  <span className="sm:w-56">
                    <TeamChips
                      teams={member.teams}
                      everyTeam={ROLE_META[resolveRoleKey(member) ?? "STAFF"].teamScope === "ALL"}
                    />
                  </span>
                  <span className="flex sm:w-24 sm:justify-end">
                    {canEdit(member) && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("Open {name}", { name: member.name ?? "" })}
                        render={
                          <Link
                            to="/dashboard/settings/members/$memberId"
                            params={{ memberId: member.id }}
                          />
                        }
                      >
                        <IconChevronRight className="size-4" />
                      </Button>
                    )}
                  </span>
                </div>
              ))}
              {visibleInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-3 py-3 opacity-90 sm:flex-row sm:items-center sm:gap-4"
                >
                  <Person name={invite.name} email={invite.email} invited />
                  <span className="sm:w-32">
                    <RoleBadge role={invite.role ?? "MEMBER"} size="sm" />
                  </span>
                  <span className="sm:w-24">
                    <Badge variant="outline" className="gap-1">
                      <IconMail className="size-3" aria-hidden="true" />
                      {t("Invited")}
                    </Badge>
                  </span>
                  <span className="sm:w-56">
                    <TeamChips teams={invite.teams} />
                  </span>
                  <span className="flex gap-1 sm:w-24 sm:justify-end">
                    {can("members.invite") && (
                      <>
                        <IconAction
                          label={copiedId === invite.id ? t("Copied") : t("Copy invite link")}
                          onClick={() => copyInvite(invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <IconCheck className="size-4 text-green-600" />
                          ) : (
                            <IconCopy className="size-4" />
                          )}
                        </IconAction>
                        <IconAction
                          label={t("Resend invite")}
                          onClick={() =>
                            resend.mutate(invite.id, {
                              onSuccess: () => toast.success(t("Invite resent")),
                              onError: () => toast.error(t("Could not resend the invite")),
                            })
                          }
                        >
                          <IconMail className="size-4" />
                        </IconAction>
                        <IconAction
                          label={t("Revoke invite")}
                          onClick={() =>
                            revoke.mutate(invite.id, {
                              onSuccess: () => toast.success(t("Invite revoked")),
                              onError: () => toast.error(t("Could not revoke the invite")),
                            })
                          }
                        >
                          <IconTrash className="size-4 text-destructive" />
                        </IconAction>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        teams={teams}
        grantableRoles={grantableRoles}
      />
    </div>
  );
}

function FilterWord({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm underline-offset-2 hover:underline",
        active && "font-medium text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Person({
  name,
  email,
  photo,
  you,
  invited,
}: Readonly<{ name?: string; email?: string; photo?: string; you?: boolean; invited?: boolean }>) {
  const { t } = useTranslation();
  const initials = (name ?? email ?? "?").toUpperCase().slice(0, 2);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {invited ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
          {initials}
        </span>
      ) : (
        <Avatar className="size-9">
          <AvatarImage src={photo ? getFileUrlFromKey(photo) : undefined} />
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {name || email}
          {you && (
            <span className="text-[11px] font-normal text-muted-foreground">({t("you")})</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}

function Presence({ status }: Readonly<{ status?: string }>) {
  const { t } = useTranslation();
  const dot =
    status === "online"
      ? "bg-green-600"
      : status === "busy"
        ? "bg-destructive"
        : "border border-muted-foreground/50";
  const label = status === "online" ? t("Online") : status === "busy" ? t("Busy") : t("Offline");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}

function TeamChips({ teams, everyTeam }: Readonly<{ teams?: MemberTeam[]; everyTeam?: boolean }>) {
  const { t } = useTranslation();
  const list = teams ?? [];
  if (everyTeam && list.length === 0) {
    return <span className="text-xs text-muted-foreground">{t("Every team")}</span>;
  }
  if (list.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconUserQuestion className="size-3.5" aria-hidden="true" />
        {t("Not in any team")}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {list.map((team) => (
        <span
          key={teamIdOf(team) ?? team.team_name}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full bg-muted-foreground"
            style={team.team_color ? { backgroundColor: team.team_color } : undefined}
          />
          {team.team_name}
        </span>
      ))}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: Readonly<{ label: string; onClick: () => void; children: React.ReactNode }>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
