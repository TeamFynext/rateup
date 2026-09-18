// Extracted verbatim from the `/dashboard/settings/users/` route so the route file carries routing
// config only. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCircleCheck,
  IconMail,
  IconMessageCircle,
  IconPlus,
  IconSearch,
  IconShield,
  IconUserCog,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { orgKeys, teamKeys } from "@/backend/org/org.keys";
import { useAllTeamsMembersOfOrg } from "@/backend/org/org.query";
import { inviteTeamMember } from "@/backend/team/team.api";
import {
  useDeleteInviteMutation,
  userResendInviteTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { UserRole } from "@/utils/enums/index.ts";
import { getOrgIdRole, getUserID } from "@/utils/userInfo.ts";

import { EditMember } from "./parts/EditMember.tsx";
import { PeopleList } from "./parts/PeopleList.tsx";
import type { SelectedUser, PendingInvitation, TeamOption } from "./parts/shared.tsx";

export function UsersPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  // Keyed by invite: one shared boolean made every card show "Copied" at once.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unassigned" | "invited">("all");
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useAllTeamsMembersOfOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Fetch Teams
  const { isLoading: isLoadingTeamsUser, data: teamsDataUser } = useTeamsByUser();

  // Form setup
  const userFormSchema = z.object({
    name: z
      .string()
      .trim()
      .min(1, translations("Name is required"))
      .min(2, translations("Name is too short")),
    email: z
      .string()
      .trim()
      .min(1, translations("Email is required"))
      .regex(/^\S+@\S+$/, translations("Please enter a valid email address")),
    teams: z.array(z.string()),
    role: z.string(),
  });

  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      teams: [],
      role: UserRole.MEMBER,
    },
  });

  const teamID = "";

  const deleteInviteMutation = useDeleteInviteMutation(teamID);
  const resendInviteMutation = userResendInviteTeamMutation();

  const handleResendInvite = (inviteId: string) => {
    toast.loading(translations("Hold on, Team Invitation is being resent."), {
      id: "load-data-invitation",
    });

    resendInviteMutation.mutate(inviteId, {
      onSuccess: () => {
        toast.success(translations("The team invitation has been resent successfully."), {
          id: "load-data-invitation",
        });
      },
      onError: () => {
        toast.error(translations("Team Invitation Resend Failed"), {
          id: "load-data-invitation",
        });
      },
    });
  };

  const handleDeleteInvite = (inviteId: string) => {
    toast.loading(translations("Hold on, Staff invite is getting deleted."), {
      id: "load-data-deleting",
    });

    deleteInviteMutation.mutate(inviteId, {
      onSuccess: () => {
        toast.success(translations("The staff invite has been deleted successfully."), {
          id: "load-data-deleting",
        });
      },
      onError: () => {
        toast.error(translations("Team Invitation Deletion Failed"), {
          id: "load-data-deleting",
        });
      },
    });
  };

  useEffect(() => {
    const loadViewerInfo = async () => {
      const [{ role }, { userId }] = await Promise.all([getOrgIdRole(), getUserID()]);
      setCurrentUserRole(role || "");
      setCurrentUserId(userId || "");
    };

    loadViewerInfo();
  }, []);

  // Preselect the first team, but only while nothing is chosen.
  useEffect(() => {
    const teams = teamsDataUser?.data;
    if (teams?.length && userForm.getValues("teams").length === 0) {
      userForm.setValue("teams", [teams[0].id]);
    }
  }, [teamsDataUser]);

  const handleMemberInvite = async () => {
    const { orgId } = await getOrgIdRole();
    const { userId } = await getUserID();
    const values = userForm.getValues();
    const inviteData = {
      name: values.name,
      email: values.email,
      orgId,
      invitedBy: userId,
      // Filed under one team; teamIds carries every team picked. None invites them into
      // the org alone, to be placed later.
      teamId: values.teams[0] ?? null,
      teamIds: values.teams,
      type: "TEAM",
      role: values.role,
    };
    return (await inviteTeamMember(inviteData)).data;
  };

  const addResourceMutation = useMutation({
    mutationFn: () => handleMemberInvite(),
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      toast.success(
        responseData?.existing
          ? translations("Staff added successfully")
          : translations("Invite sent successfully."),
      );
      userForm.reset();
      setIsAddUserDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error creating invite:", error?.message);
      toast.error(error?.message || "An error occurred");
    },
  });

  const teamOptions = (teamsDataUser?.data ?? []).map((team: TeamOption) => ({
    value: team.id,
    label: team.name,
  }));

  const allMembers: SelectedUser[] = data?.data?.members ?? [];
  const allInvitations: PendingInvitation[] = data?.data?.invitations ?? [];

  const matchesSearch = (person: { name?: string; email?: string }) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (person.name?.toLowerCase().includes(q) ?? false) ||
      (person.email?.toLowerCase().includes(q) ?? false)
    );
  };

  /** Access is granted through teams, so someone in none can sign in and reach nothing. */
  const unassignedCount = allMembers.filter((member) => (member.teams?.length ?? 0) === 0).length;

  const filteredMembers = allMembers
    .filter(matchesSearch)
    .filter((member) =>
      filter === "unassigned"
        ? (member.teams?.length ?? 0) === 0
        : filter === "invited"
          ? false
          : true,
    );

  const filteredInvitations = allInvitations
    .filter(matchesSearch)
    .filter(() => filter !== "unassigned");

  const handleCopy = async (id: string) => {
    const link = `${import.meta.env.VITE_FRONTEND_URL}/invite?type=team&token=${id}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-4">
      <div>
        <h2 className="mb-1 text-2xl">{translations("Users")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Who can sign in, and which teams they work in.")}
        </p>
      </div>

      {/* One sentence rather than a row of stat tiles. Each fragment is a filter,
          because the counts are only useful if you can act on them. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-sm underline-offset-2 hover:underline",
            filter === "all" && "font-medium text-foreground",
          )}
        >
          {translations("{count} people", { count: allMembers.length })}
        </button>

        {unassignedCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setFilter(filter === "unassigned" ? "all" : "unassigned")}
              className={cn(
                "rounded-sm underline-offset-2 hover:underline",
                filter === "unassigned" && "font-medium text-foreground",
              )}
            >
              {translations("{count} in no team", { count: unassignedCount })}
            </button>
          </>
        )}

        {allInvitations.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setFilter(filter === "invited" ? "all" : "invited")}
              className={cn(
                "rounded-sm underline-offset-2 hover:underline",
                filter === "invited" && "font-medium text-foreground",
              )}
            >
              {translations("{count} invited", { count: allInvitations.length })}
            </button>
          </>
        )}
      </div>

      <Card className="w-full p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Dialog
            open={isAddUserDialogOpen}
            onOpenChange={(open) => {
              setIsAddUserDialogOpen(open);
              if (!open) userForm.reset();
            }}
          >
            <DialogTrigger render={<Button className="h-10 shrink-0" />}>
              <IconPlus className="w-4 h-4 mr-2" />
              {translations("Add New User")}
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <IconPlus className="w-4 h-4 text-white" />
                  </div>
                  {translations("Add New User")}
                </DialogTitle>
                <DialogDescription>
                  {translations("Create a new user account and assign roles and team membership")}.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={userForm.handleSubmit(() => addResourceMutation.mutate())}
                className="flex flex-col gap-4 py-3"
              >
                <FieldGroup className="gap-3">
                  <Controller
                    name="name"
                    control={userForm.control}
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="new-name" className="text-xs">
                          {translations("Full Name")} <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          id="new-name"
                          placeholder="John Doe"
                          className="h-9"
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldError errors={[fieldState.error]} className="text-xs" />
                      </Field>
                    )}
                  />

                  <Controller
                    name="email"
                    control={userForm.control}
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="new-email" className="text-xs">
                          {translations("Email Address")}{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <InputGroup className="h-9">
                          <InputGroupAddon>
                            <IconMail />
                          </InputGroupAddon>
                          <InputGroupInput
                            {...field}
                            id="new-email"
                            type="email"
                            placeholder="john@company.com"
                            aria-invalid={fieldState.invalid}
                          />
                        </InputGroup>
                        <FieldError errors={[fieldState.error]} className="text-xs" />
                      </Field>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="new-role" className="text-xs">
                        {translations("User Role")} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={userForm.watch("role")}
                        onValueChange={(value) => userForm.setValue("role", value ?? "")}
                        items={[
                          { value: UserRole.SUPADM, label: translations("Super Admin") },
                          { value: UserRole.ADM, label: translations("Admin") },
                          { value: UserRole.MEMBER, label: translations("Staff") },
                        ]}
                      >
                        <SelectTrigger id="new-role" className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.SUPADM}>
                            <div className="flex items-center gap-2">
                              <IconShield className="w-3.5 h-3.5 text-primary" />
                              <span>{translations("Super Admin")}</span>
                              <Badge className="bg-primary text-[10px] h-4 px-1.5">
                                {translations("Full Access")}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value={UserRole.ADM}>
                            <div className="flex items-center gap-2">
                              <IconUserCog className="w-3.5 h-3.5 text-rateup-orange" />
                              <span>{translations("Admin")}</span>
                              <Badge className="bg-rateup-orange text-[10px] h-4 px-1.5">
                                {translations("Team Lead")}
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value={UserRole.MEMBER}>
                            <div className="flex items-center gap-2">
                              <IconMessageCircle className="w-3.5 h-3.5 text-green-600" />
                              <span>{translations("Staff")}</span>
                              <Badge className="bg-green-600 text-[10px] h-4 px-1.5">
                                {translations("Support")}
                              </Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field className="gap-1.5">
                      <FieldLabel htmlFor="new-teams" className="text-xs">
                        {translations("Team Assignment")}
                      </FieldLabel>
                      {isLoadingTeamsUser ? (
                        <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
                      ) : (
                        // Access is per team and people work across more than one.
                        <MultiSelect
                          options={teamOptions}
                          value={userForm.watch("teams")}
                          onValueChange={(value) => userForm.setValue("teams", value)}
                          className="w-full"
                          placeholder={translations("Select teams")}
                          emptyIndicator={translations("No teams found")}
                        />
                      )}
                    </Field>
                  </div>

                  {/* What happens on submit, stated rather than offered as a choice. The
                        invite *is* an email — there is no invite without it — and the invitee
                        sets their own password when they follow the link, so neither was ever
                        something an admin could switch off. */}
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <IconMail className="mt-0.5 size-3.5 shrink-0" />
                    {translations("We'll email an invite link so they can set their own password.")}
                  </p>
                </FieldGroup>

                <DialogFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsAddUserDialogOpen(false);
                      userForm.reset();
                    }}
                  >
                    {translations("Cancel")}
                  </Button>
                  <Button type="submit" disabled={addResourceMutation.isPending}>
                    <IconCircleCheck className="w-4 h-4 mr-2" />
                    {addResourceMutation.isPending
                      ? translations("Inviting")
                      : translations("Invite User")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="relative flex-1">
            <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={translations("Search by name or email")}
              className="h-10 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>
      <Card className="w-full p-4">
        <PeopleList
          members={filteredMembers}
          invitations={filteredInvitations}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          canManageAll={currentUserRole === UserRole.SUPADM}
          copiedId={copiedId}
          onCopyInvite={handleCopy}
          onResendInvite={handleResendInvite}
          onDeleteInvite={handleDeleteInvite}
          onEditMember={(member) => {
            setSelectedUser(member);
            setIsEditUserDialogOpen(true);
          }}
          isResending={resendInviteMutation.isPending}
          isDeleting={deleteInviteMutation.isPending}
        />
      </Card>
      <EditMember
        isEditUserDialogOpen={isEditUserDialogOpen}
        setIsEditUserDialogOpen={setIsEditUserDialogOpen}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        teams={teamsDataUser?.data ?? []}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
      />
    </div>
  );
}
