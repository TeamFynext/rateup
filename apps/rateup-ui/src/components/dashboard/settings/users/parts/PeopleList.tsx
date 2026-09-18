import {
  IconCheck,
  IconCopy,
  IconMail,
  IconPencil,
  IconTrash,
  IconUserQuestion,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import type { PendingInvitation, SelectedUser, UserTeam } from "./shared.tsx";

/**
 * People as rows: the jobs here — find one person, see their teams, spot who is in none —
 * want a scannable column of names. Unaccepted invitations share the list, styled quieter.
 */

const teamsOf = (teams: UserTeam[] | undefined) => teams ?? [];

function TeamChips({ teams }: Readonly<{ teams: UserTeam[] | undefined }>) {
  const { t } = useTranslation();
  const list = teamsOf(teams);

  if (list.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconUserQuestion className="size-3.5" />
        {t("Not in any team")}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      {list.map((team) => (
        <span
          key={team.id ?? team.team_id ?? team.teamId ?? team.team_name}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs"
        >
          {/* The team's own colour, the same swatch the Teams page uses. */}
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

/**
 * Presence as `orgMember.status` stores it, coloured like the sidebar's status picker.
 * Offline is a hollow dot so a list of absent people does not read as unread markers.
 */
function presenceOf(status: string | undefined, t: TFunction) {
  // Written out per branch: the translation extractor only sees literal `t("…")` calls.
  if (status === "online") return { label: t("Online"), dot: "bg-green-600", onAvatar: true };
  if (status === "busy") return { label: t("Busy"), dot: "bg-red-500", onAvatar: true };
  return { label: t("Offline"), dot: "border border-muted-foreground/50", onAvatar: false };
}

function PresenceLabel({ status }: Readonly<{ status: string | undefined }>) {
  const { t } = useTranslation();
  const { label, dot } = presenceOf(status, t);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  );
}

function Row({ children, muted }: Readonly<{ children: React.ReactNode; muted?: boolean }>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4",
        muted && "opacity-90",
      )}
    >
      {children}
    </div>
  );
}

interface Props {
  members: SelectedUser[];
  invitations: PendingInvitation[];
  currentUserRole: string;
  currentUserId: string;
  canManageAll: boolean;
  copiedId: string | null;
  onCopyInvite: (id: string) => void;
  onResendInvite: (id: string) => void;
  onDeleteInvite: (id: string) => void;
  onEditMember: (member: SelectedUser) => void;
  isResending: boolean;
  isDeleting: boolean;
}

export function PeopleList({
  members,
  invitations,
  currentUserRole,
  currentUserId,
  canManageAll,
  copiedId,
  onCopyInvite,
  onResendInvite,
  onDeleteInvite,
  onEditMember,
  isResending,
  isDeleting,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (members.length === 0 && invitations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm font-medium">{t("No one matches that search")}</p>
        <p className="text-sm text-muted-foreground">
          {t("Try a different name or email, or clear the search to see everyone.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="hidden gap-4 border-b border-border pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
        <span className="flex-1">{t("Person")}</span>
        <span className="w-28">{t("Role")}</span>
        <span className="w-24">{t("Status")}</span>
        <span className="w-56">{t("Teams")}</span>
        <span className="w-24 text-right">{t("Actions")}</span>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {members.map((member) => {
          const canEdit = canManageAll || member.id === currentUserId;
          const presence = presenceOf(member.status, t);

          return (
            <Row key={member.id}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="size-9">
                    <AvatarImage src={getFileUrlFromKey(member.profilePhoto ?? "")} />
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {member.name?.toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Only the "here" states get a dot; offline is said in the Status column. */}
                  {presence.onAvatar && (
                    <span
                      aria-label={presence.label}
                      className={cn(
                        "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card",
                        presence.dot,
                      )}
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {member.name}
                    {member.id === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {t("(you)")}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                </div>
              </div>

              <div className="sm:w-28">
                <Badge variant="outline" className="text-xs font-normal">
                  {member.role}
                </Badge>
                {member.isPaused && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-500"
                  >
                    {t("Paused")}
                  </Badge>
                )}
              </div>

              <div className="sm:w-24">
                <PresenceLabel status={member.status} />
              </div>

              <div className="sm:w-56">
                <TeamChips teams={member.teams} />
              </div>

              <div className="flex sm:w-24 sm:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => onEditMember(member)}
                >
                  <IconPencil className="size-4" />
                  {t("Edit")}
                </Button>
              </div>
            </Row>
          );
        })}

        {invitations.map((invite) => (
          <Row key={invite.id} muted>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* A dashed ring says "not here yet". */}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                {invite.name?.toUpperCase().slice(0, 2)}
              </span>

              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-muted-foreground">
                  {invite.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">{invite.email}</span>
              </div>
            </div>

            <div className="sm:w-28">
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                {t("Invited")}
              </Badge>
            </div>

            {/* An invitation has no presence to report — it is a person who has not arrived. */}
            <div className="text-xs text-muted-foreground sm:w-24">—</div>

            <div className="sm:w-56">
              <TeamChips teams={invite.teams} />
            </div>

            <div className="flex items-center gap-0.5 sm:w-24 sm:justify-end">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Copy invite link")}
                      onClick={() => onCopyInvite(invite.id ?? "")}
                    />
                  }
                >
                  {copiedId === invite.id ? (
                    <IconCheck className="size-4" />
                  ) : (
                    <IconCopy className="size-4" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {copiedId === invite.id ? t("Copied") : t("Copy invite link")}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("Resend invite")}
                      disabled={isResending}
                      onClick={() => onResendInvite(invite.id ?? "")}
                    />
                  }
                >
                  <IconMail className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("Resend invite")}</TooltipContent>
              </Tooltip>

              {currentUserRole && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("Delete invite")}
                        disabled={isDeleting}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteInvite(invite.id ?? "")}
                      />
                    }
                  >
                    <IconTrash className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>{t("Delete invite")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </Row>
        ))}
      </div>
    </div>
  );
}
