import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Database,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";
import z from "zod";

import { useAllTeamsMembersOfOrg, useUpdateRoleMutation } from "@/backend/org/org.query";
import { inviteTeamMember } from "@/backend/team/team.api";
import {
  useAddUsertoTeams,
  useDeleteInviteMutation,
  useRemoveUserFromTeam,
  userResendInviteTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import {
  useUpdateActiveStatusMutation,
  useUpdateMemberProfileMutation,
  useUpdateProfileMutation,
  useUpdateUserPause,
} from "@/backend/user/user.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
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
import { Separator } from "@/components/ui/separator.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils.ts";
import { UserRole } from "@/utils/enums/index.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { getOrgIdRole, getUserID } from "@/utils/userInfo.ts";

export const Route = createFileRoute("/dashboard/settings/users/")({
  component: UsersPage,
});

interface SelectedUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  role?: string;
  teams?: any[];
  status?: string;
  profilePhoto?: string;
  isPaused?: boolean;
  lastActive?: string;
}

interface TeamOption {
  id: string;
  name: string;
  color?: string;
}

function UsersPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useAllTeamsMembersOfOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [newUserProfileImage, setNewUserProfileImage] = useState<string | null>(null);
  const [newUserPhone, setNewUserPhone] = useState("");

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
    team: z.string(),
  });

  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      team: "none",
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

  useEffect(() => {
    const teams = teamsDataUser?.data;
    if (teams && teams.length > 0) {
      userForm.setValue("team", teams[0].id);
    } else {
      userForm.setValue("team", "none");
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
      teamId: values.team === "none" ? null : values.team,
      type: "TEAM",
    };
    return (await inviteTeamMember(inviteData)).data;
  };

  const addResourceMutation = useMutation({
    mutationFn: () => handleMemberInvite(),
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      toast.success(
        responseData?.existing
          ? translations("Staff added successfully")
          : translations("Invite sent successfully."),
      );
      userForm.reset();
      setIsAddUserDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating invite:", error?.message);
      toast.error(error?.message || "An error occurred");
    },
  });

  const filteredMembers = data?.data?.members?.filter((member) => {
    const q = searchQuery.toLowerCase();
    return member.name?.toLowerCase().includes(q) || member.email?.toLowerCase().includes(q);
  });

  const filteredInvitations = data?.data?.invitations?.filter((invite) => {
    const q = searchQuery.toLowerCase();
    return invite.name?.toLowerCase().includes(q) || invite.email?.toLowerCase().includes(q);
  });

  const handleCopy = async (id: string) => {
    const link = `${import.meta.env.VITE_FRONTEND_URL}/invite?type=team&token=${id}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col items-start w-full gap-4">
      <div>
        <h2 className="text-2xl mb-1">{translations("User Management")}</h2>
        <p className="text-sm text-muted-foreground">
          {translations("Add and manage users with different access levels")}
        </p>
      </div>
      <Card className="p-4 w-full">
        <div className="flex items-center gap-3">
          <Dialog
            open={isAddUserDialogOpen}
            onOpenChange={(open) => {
              setIsAddUserDialogOpen(open);
              if (!open) {
                userForm.reset();
                setNewUserPhone("");
                setNewUserProfileImage(null);
              }
            }}
          >
            <DialogTrigger render={<Button className="h-10 shrink-0" />}>
              <Plus className="w-4 h-4 mr-2" />
              {translations("Add New User")}
            </DialogTrigger>

            <DialogContent className="sm:max-w-175">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
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
                <div className="grid grid-cols-[180px_1fr] gap-6">
                  {/* Left: Profile Picture */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-32 h-32 ring-2 ring-gray-200">
                      {newUserProfileImage ? (
                        <AvatarImage src={newUserProfileImage} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white">
                          <User className="w-12 h-12" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (event: Event) => {
                          const target = event.target as HTMLInputElement;
                          const file = target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (loadEvent) => {
                            setNewUserProfileImage(loadEvent.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-3 h-3 mr-1.5" />
                      {translations("Upload")}
                    </Button>
                  </div>

                  {/* Right: Form Fields */}
                  <FieldGroup className="gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Controller
                        name="name"
                        control={userForm.control}
                        render={({ field, fieldState }) => (
                          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="new-name" className="text-xs">
                              {translations("Full Name")}{" "}
                              <span className="text-destructive">*</span>
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

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="new-phone" className="text-xs">
                          {translations("Phone Number")}
                        </FieldLabel>
                        <PhoneInput
                          id="new-phone"
                          placeholder={translations("Enter phone number")}
                          className="h-9"
                          defaultCountry="IN"
                          value={newUserPhone}
                          onChange={(value) => setNewUserPhone(value || "")}
                        />
                      </Field>
                    </div>

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
                              <Mail />
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
                          defaultValue={UserRole.MEMBER}
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
                                <Shield className="w-3.5 h-3.5 text-primary" />
                                <span>{translations("Super Admin")}</span>
                                <Badge className="bg-primary text-[10px] h-4 px-1.5">
                                  {translations("Full Access")}
                                </Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.ADM}>
                              <div className="flex items-center gap-2">
                                <UserCog className="w-3.5 h-3.5 text-rateup-orange" />
                                <span>{translations("Admin")}</span>
                                <Badge className="bg-rateup-orange text-[10px] h-4 px-1.5">
                                  {translations("Team Lead")}
                                </Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value={UserRole.MEMBER}>
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
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
                        <FieldLabel htmlFor="new-team" className="text-xs">
                          {translations("Team Assignment")}
                        </FieldLabel>
                        {isLoadingTeamsUser ? (
                          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
                        ) : (
                          <Select
                            value={userForm.watch("team")}
                            onValueChange={(value) => userForm.setValue("team", value)}
                            items={[
                              { value: "none", label: translations("No Team") },
                              ...(teamsDataUser?.data?.map((team: TeamOption) => ({
                                value: team.id,
                                label: team.name,
                              })) ?? []),
                            ]}
                          >
                            <SelectTrigger id="new-team" className="h-9 w-full">
                              <SelectValue placeholder={translations("Select team")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">
                                  {translations("No Team")}
                                </span>
                              </SelectItem>
                              {teamsDataUser?.data?.map((team: TeamOption) => (
                                <SelectItem key={team.id} value={team.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: team.color }}
                                    />
                                    {team.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                    </div>

                    <FieldGroup className="gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                      <Field orientation="horizontal" data-disabled>
                        <FieldLabel htmlFor="new-welcome-email" className="text-xs">
                          {translations("Send welcome email")}
                        </FieldLabel>
                        <Switch id="new-welcome-email" defaultChecked disabled />
                      </Field>
                      <Field orientation="horizontal" data-disabled>
                        <FieldLabel htmlFor="new-require-password-change" className="text-xs">
                          {translations("Require password change")}
                        </FieldLabel>
                        <Switch id="new-require-password-change" defaultChecked disabled />
                      </Field>
                    </FieldGroup>
                  </FieldGroup>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsAddUserDialogOpen(false);
                      userForm.reset();
                      setNewUserPhone("");
                      setNewUserProfileImage(null);
                    }}
                  >
                    {translations("Cancel")}
                  </Button>
                  <Button type="submit" disabled={addResourceMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {addResourceMutation.isPending
                      ? translations("Inviting")
                      : translations("Invite User")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={translations("Search users by name or email")}
              className="pl-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>
      <div className="flex flex-col w-full">
        {data?.data?.members?.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
              {translations("Active Members")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
              {filteredMembers?.map((member: any) => (
                <Card key={member.id} className="p-3 group relative">
                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    <div className="relative mb-2">
                      <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                        <AvatarImage src={getFileUrlFromKey(member.profilePhoto)} />
                        <AvatarFallback className="bg-primary text-white">
                          {member.name?.toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {member.status === "online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <h4 className="text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {member.name}
                    </h4>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1 w-full">
                      {member.email}
                    </p>

                    <Badge className="text-[10px] h-5 px-2 mb-2">{member.role}</Badge>

                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />

                      <Tooltip>
                        <TooltipTrigger
                          render={<div className="flex items-center gap-1 cursor-default" />}
                        >
                          <span className="line-clamp-1">
                            {member?.teams.length === 0
                              ? "Not in any team"
                              : member.teams
                                  .slice(0, 2)
                                  .map((t: any) => t.team_name)
                                  .join(", ")}
                            {member.teams.length > 2 ? "..." : ""}
                          </span>
                        </TooltipTrigger>

                        <TooltipContent className="border shadow-md rounded-lg p-2 text-xs max-w-52">
                          <div className="flex flex-col gap-1">
                            {member.teams.map((t: any) => (
                              <div key={t.id} className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: t.team_color || "#ccc",
                                  }}
                                />
                                <span>{t.team_name}</span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs mt-1"
                      disabled={currentUserRole !== UserRole.SUPADM && member?.id !== currentUserId}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(member);
                        setIsEditUserDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      {translations("Edit Profile")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {data?.data?.invitations?.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">
              {translations("Pending Invitations")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
              {filteredInvitations?.map((invite: any) => (
                <Card
                  key={invite.id}
                  className="p-3 border-dashed border-gray-300 hover:border-rateup-orange/40 hover:shadow-md transition-all group relative"
                >
                  <button
                    type="button"
                    className="absolute top-2 right-2 border rounded-sm p-1 hover:text-primary cursor-pointer"
                    onClick={() => handleCopy(invite?.id)}
                    aria-label={translations("Copy")}
                    title={copied ? translations("Copied") : translations("Copy")}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                      <AvatarFallback className="bg-yellow-500 text-white">
                        {invite?.name?.toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <h4 className="text-sm mb-1 text-rateup-orange line-clamp-1">{invite.name}</h4>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1 w-full">
                      {invite.email}
                    </p>

                    <Badge className="text-[10px] h-5 px-2 mb-2 bg-yellow-100 text-yellow-800 border border-yellow-200">
                      {invite.status}
                    </Badge>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />
                      <span className="line-clamp-1">
                        {invite.teams.map((t: any) => t.team_name).join(", ")}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs mt-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResendInvite(invite?.id);
                      }}
                      disabled={resendInviteMutation.isPending}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      {translations("Resend Invite")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs mt-1 border-red-300 text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteInvite(invite?.id);
                      }}
                      disabled={deleteInviteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {translations("Delete Invite")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
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

function EditMember({
  isEditUserDialogOpen,
  setIsEditUserDialogOpen,
  selectedUser,
  setSelectedUser,
  teams,
  currentUserRole,
  currentUserId,
}) {
  const { t: translations } = useTranslation();
  const queryClient = useQueryClient();
  const updatePauseStatus = useUpdateUserPause();
  const updateRole = useUpdateRoleMutation();
  const addUserToTeams = useAddUsertoTeams();
  const removeUserFromTeam = useRemoveUserFromTeam("");
  const updateProfile = useUpdateProfileMutation();
  const updateMemberProfile = useUpdateMemberProfileMutation();
  const updateActiveStatus = useUpdateActiveStatusMutation();
  const [role, setRole] = useState<string>(selectedUser?.role || UserRole.MEMBER);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editableName, setEditableName] = useState("");
  const [editablePhone, setEditablePhone] = useState("");
  const [editableGender, setEditableGender] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!selectedUser) return;

    setRole(selectedUser.role || UserRole.MEMBER);
    setProfileImage(
      selectedUser.profilePhoto ? getFileUrlFromKey(selectedUser.profilePhoto) : null,
    );
    setEditableName(selectedUser.name || "");
    setEditablePhone(selectedUser.phone || "");
    setEditableGender(selectedUser.gender || "");
    setSelectedTeamIds(
      (selectedUser.teams || [])
        .map((team: any) => team?.id || team?.team_id || team?.teamId)
        .filter(Boolean),
    );
  }, [selectedUser]);

  const canEditNameAndPhone =
    currentUserRole === UserRole.SUPADM || selectedUser?.id === currentUserId;
  const canEditAll = currentUserRole === UserRole.SUPADM;

  const closeDialog = () => {
    setIsEditUserDialogOpen(false);
    setSelectedUser(null);
    setProfileImage(null);
  };

  function onChangeRole(id: string, nextRole: string) {
    const roleData = { memberId: id, body: { role: nextRole } };
    updateRole.mutate(roleData);
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
    });
  }

  const handleUserStatus = () => {
    if (!selectedUser?.id) return;

    const pauseData = {
      isPaused: !selectedUser.isPaused,
      pausedBy: "org",
    };

    updatePauseStatus.mutate(
      { userId: selectedUser.id, data: pauseData },
      {
        onSuccess: () => {
          setSelectedUser({
            ...selectedUser,
            isPaused: !selectedUser.isPaused,
          });
        },
      },
    );
  };

  const handleDeleteUser = async () => {
    if (!selectedUser?.id) return;

    const shouldDelete = await confirm({
      title: translations("Delete User Account"),
      description: `${translations("Are you sure you want to delete")} ${selectedUser?.name || translations("this user")}? ${translations("This action cannot be undone.")}`,
      confirmText: translations("Delete User"),
      cancelText: translations("Cancel"),
    });

    if (!shouldDelete) return;

    toast.loading(translations("Deleting user account"), {
      id: "delete-user",
    });

    updateActiveStatus.mutate(selectedUser.id, {
      onSuccess: () => {
        toast.success(translations("User deleted successfully"), {
          id: "delete-user",
        });
        closeDialog();
      },
      onError: (error: any) => {
        toast.error(error?.message || translations("Failed to delete user"), {
          id: "delete-user",
        });
      },
    });
  };

  const handleSaveProfile = () => {
    if (!selectedUser) return;

    if (!canEditNameAndPhone) {
      toast.error(translations("You can only update your own profile data"));
      return;
    }

    const normalizedName = editableName.trim();
    if (!normalizedName) {
      toast.error(translations("Name is required"));
      return;
    }

    if (!editableGender) {
      toast.error(translations("Select a title"));
      return;
    }

    if (editablePhone && !isValidPhoneNumber(editablePhone)) {
      toast.error(translations("Please enter a valid phone number"));
      return;
    }

    toast.loading(translations("Updating user profile"), {
      id: "update-profile",
    });

    const profileData = {
      title: editableGender,
      name: normalizedName,
      phone: editablePhone || "",
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      toast.success(translations("User updated successfully"), {
        id: "update-profile",
      });
      closeDialog();
    };

    const onError = (error: any) => {
      toast.error(error?.message || translations("Failed to update user"), {
        id: "update-profile",
      });
    };

    const isEditingSelf = selectedUser.id === currentUserId;

    if (isEditingSelf) {
      updateProfile.mutate(profileData, { onSuccess, onError });
    } else {
      updateMemberProfile.mutate(
        { userId: selectedUser.id, data: profileData },
        {
          onSuccess,
          onError: (error: any) => {
            onError(error);
          },
        },
      );
    }
  };

  const handleTeamAssignmentChange = async (nextTeamIds: string[]) => {
    if (!selectedUser?.id) return;
    if (!canEditAll) return;

    const previousTeamIds = selectedTeamIds;
    const teamIdsToAdd = nextTeamIds.filter((teamId) => !previousTeamIds.includes(teamId));
    const teamIdsToRemove = previousTeamIds.filter((teamId) => !nextTeamIds.includes(teamId));

    setSelectedTeamIds(nextTeamIds);

    if (teamIdsToAdd.length === 0 && teamIdsToRemove.length === 0) return;

    setIsUpdatingTeams(true);
    toast.loading(translations("Updating team assignment"), {
      id: "update-team-assignment",
    });

    const tasks: Promise<unknown>[] = [];

    if (teamIdsToAdd.length > 0) {
      tasks.push(
        new Promise((resolve, reject) => {
          addUserToTeams.mutate(
            {
              userId: selectedUser.id,
              teamIds: teamIdsToAdd,
              userEmail: selectedUser.email,
            },
            {
              onSuccess: resolve,
              onError: reject,
            },
          );
        }),
      );
    }

    teamIdsToRemove.forEach((teamId) => {
      tasks.push(
        new Promise((resolve, reject) => {
          removeUserFromTeam.mutate(
            { teamId, userId: selectedUser.id },
            {
              onSuccess: resolve,
              onError: reject,
            },
          );
        }),
      );
    });

    const results = await Promise.allSettled(tasks);
    const hasError = results.some((result) => result.status === "rejected");

    if (hasError) {
      toast.error(translations("Failed to update team assignment"), {
        id: "update-team-assignment",
      });
      setSelectedTeamIds(previousTeamIds);
    } else {
      toast.success(translations("Team assignment updated successfully"), {
        id: "update-team-assignment",
      });
    }

    setIsUpdatingTeams(false);
  };

  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: team.name,
  }));

  return (
    <Dialog
      open={isEditUserDialogOpen}
      onOpenChange={(open) => {
        setIsEditUserDialogOpen(open);
        if (!open) {
          setSelectedUser(null);
          setProfileImage(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2E5BFF] flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
            {translations("Edit User")}
          </DialogTitle>
          <DialogDescription>
            {translations("Update user information, role, and account settings")}.
          </DialogDescription>
        </DialogHeader>

        {selectedUser && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="details">{translations("User Details")}</TabsTrigger>
              <TabsTrigger value="permissions">{translations("Permissions")}</TabsTrigger>
              <TabsTrigger value="settings">{translations("Settings")}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-[180px_1fr] gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="w-32 h-32 ring-2 ring-gray-200">
                    {profileImage ? (
                      <AvatarImage src={profileImage} />
                    ) : (
                      <AvatarFallback className="bg-[#2E5BFF] text-white">
                        <User className="w-12 h-12" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (event: Event) => {
                        const target = event.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = (loadEvent) => {
                          setProfileImage(loadEvent.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                  >
                    <Upload className="w-3 h-3 mr-1.5" />
                    {translations("Change Photo")}
                  </Button>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedUser.status === "online" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {selectedUser.status || translations("Unknown")}
                    </span>
                  </div>
                </div>

                <FieldGroup className="gap-3">
                  <Field className="gap-1.5" data-disabled={!canEditNameAndPhone}>
                    <FieldLabel htmlFor="edit-gender" className="text-xs">
                      {translations("Title")} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      value={editableGender}
                      onValueChange={setEditableGender}
                      disabled={!canEditNameAndPhone}
                      items={[
                        { value: "MALE", label: "Mr" },
                        { value: "FEMALE", label: "Mrs" },
                        { value: "OTHER", label: "Mx" },
                      ]}
                    >
                      <SelectTrigger id="edit-gender" className="h-9">
                        <SelectValue placeholder={translations("Select title")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Mr</SelectItem>
                        <SelectItem value="FEMALE">Mrs</SelectItem>
                        <SelectItem value="OTHER">Mx</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field className="gap-1.5" data-disabled={!canEditNameAndPhone}>
                      <FieldLabel htmlFor="edit-name" className="text-xs">
                        {translations("Full Name")} <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="edit-name"
                        value={editableName}
                        onChange={(event) => setEditableName(event.target.value)}
                        className="h-9"
                        disabled={!canEditNameAndPhone}
                      />
                    </Field>

                    <Field className="gap-1.5" data-disabled={!canEditNameAndPhone}>
                      <FieldLabel htmlFor="edit-phone" className="text-xs">
                        {translations("Phone Number")}
                      </FieldLabel>
                      <PhoneInput
                        id="edit-phone"
                        placeholder={translations("Enter phone number")}
                        className="h-9"
                        defaultCountry="IN"
                        value={editablePhone}
                        onChange={(value) => setEditablePhone(value || "")}
                        disabled={!canEditNameAndPhone}
                      />
                    </Field>
                  </div>

                  <Field className="gap-1.5" data-disabled>
                    <FieldLabel htmlFor="edit-email" className="text-xs">
                      {translations("Email Address")} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <InputGroup className="h-9">
                      <InputGroupAddon>
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="edit-email"
                        type="email"
                        defaultValue={selectedUser.email}
                        disabled
                      />
                    </InputGroup>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldTitle className="text-xs">{translations("Last Active")}</FieldTitle>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {selectedUser.lastActive || translations("Not available")}
                      </span>
                    </div>
                  </Field>

                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="edit-account-status" className="text-xs">
                      {translations("Account Status")}
                    </FieldLabel>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2 rounded-full",
                            selectedUser.isPaused ? "bg-gray-400" : "bg-green-500",
                          )}
                        />
                        <span className="text-sm">
                          {selectedUser.isPaused
                            ? translations("Inactive Account")
                            : translations("Active Account")}
                        </span>
                      </div>
                      <Switch
                        id="edit-account-status"
                        checked={!selectedUser.isPaused}
                        onCheckedChange={handleUserStatus}
                      />
                    </div>
                  </Field>
                </FieldGroup>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <FieldGroup className="gap-3">
                <Field className="gap-1.5" data-disabled={!canEditAll}>
                  <FieldLabel htmlFor="edit-role" className="text-xs">
                    {translations("User Role")} <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={role}
                    disabled={!canEditAll}
                    items={[
                      { value: UserRole.SUPADM, label: translations("Super Admin") },
                      { value: UserRole.ADM, label: translations("Admin") },
                      { value: UserRole.MEMBER, label: translations("Staff") },
                    ]}
                    onValueChange={(nextRole) => {
                      if (!canEditAll) return;
                      if (!selectedUser.id) return;
                      setRole(nextRole);
                      onChangeRole(selectedUser.id, nextRole);
                    }}
                  >
                    <SelectTrigger id="edit-role" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.SUPADM}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          <span>{translations("Super Admin")}</span>
                          <Badge className="bg-primary text-[10px] h-4 px-1.5">
                            {translations("Full Access")}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value={UserRole.ADM}>
                        <div className="flex items-center gap-2">
                          <UserCog className="w-3.5 h-3.5 text-rateup-orange" />
                          <span>{translations("Admin")}</span>
                          <Badge className="bg-rateup-orange text-[10px] h-4 px-1.5">
                            {translations("Team Lead")}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value={UserRole.MEMBER}>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                          <span>{translations("Staff")}</span>
                          <Badge className="bg-green-600 text-[10px] h-4 px-1.5">
                            {translations("Support")}
                          </Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="gap-1.5" data-disabled={!canEditAll || isUpdatingTeams}>
                  <FieldTitle className="text-xs">{translations("Team Assignment")}</FieldTitle>
                  <MultiSelect
                    options={teamOptions}
                    value={selectedTeamIds}
                    onValueChange={handleTeamAssignmentChange}
                    disabled={!canEditAll || isUpdatingTeams}
                    className="w-full"
                    placeholder={translations("Select teams")}
                    emptyIndicator={translations("No teams found")}
                  />
                </Field>

                <FieldSeparator className="my-4" />

                <FieldSet>
                  <FieldLegend variant="label" className="text-xs">
                    {translations("Additional Permissions")}
                  </FieldLegend>
                  <FieldGroup className="gap-2 p-3 bg-muted rounded-lg border">
                    <Field orientation="horizontal" data-disabled>
                      <MessageSquare className="w-4 h-4 shrink-0 text-primary" />
                      <FieldContent>
                        <FieldLabel htmlFor="perm-inbox" className="font-normal">
                          {translations("Access to Inbox")}
                        </FieldLabel>
                        <FieldDescription>
                          {translations("View and respond to customer messages")}
                        </FieldDescription>
                      </FieldContent>
                      <Switch id="perm-inbox" defaultChecked disabled />
                    </Field>
                    <Separator />
                    <Field orientation="horizontal" data-disabled>
                      <Zap className="w-4 h-4 shrink-0 text-rateup-orange" />
                      <FieldContent>
                        <FieldLabel htmlFor="perm-automations" className="font-normal">
                          {translations("Manage Automations")}
                        </FieldLabel>
                        <FieldDescription>
                          {translations("Create and edit workflow automation")}
                        </FieldDescription>
                      </FieldContent>
                      <Switch id="perm-automations" disabled />
                    </Field>
                    <Separator />
                    <Field orientation="horizontal" data-disabled>
                      <Database className="w-4 h-4 shrink-0 text-green-600" />
                      <FieldContent>
                        <FieldLabel htmlFor="perm-analytics" className="font-normal">
                          {translations("View Analytics")}
                        </FieldLabel>
                        <FieldDescription>
                          {translations("Access reports and data insights")}
                        </FieldDescription>
                      </FieldContent>
                      <Switch id="perm-analytics" defaultChecked disabled />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <FieldGroup className="gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900">
                <Field orientation="horizontal" data-disabled>
                  <FieldLabel htmlFor="setting-email-notifications" className="text-xs">
                    {translations("Email notifications enabled")}
                  </FieldLabel>
                  <Switch id="setting-email-notifications" defaultChecked disabled />
                </Field>
                <Separator />
                <Field orientation="horizontal" data-disabled>
                  <FieldLabel htmlFor="setting-two-factor" className="text-xs">
                    {translations("Two-factor authentication")}
                  </FieldLabel>
                  <Switch id="setting-two-factor" disabled />
                </Field>
                <Separator />
                <Field orientation="horizontal" data-disabled>
                  <FieldLabel htmlFor="setting-mobile-access" className="text-xs">
                    {translations("Allow mobile app access")}
                  </FieldLabel>
                  <Switch id="setting-mobile-access" defaultChecked disabled />
                </Field>
              </FieldGroup>

              <Separator className="my-4" />

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm text-orange-700 mb-1">
                      {translations("Password Reset")}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {translations("Send a password reset email to the user")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-300 hover:bg-orange-100"
                      disabled
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      {translations("Send Reset Link")}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm text-red-700 mb-1">
                      {translations("Delete User Account")}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {translations(
                        "Permanently remove this user and all associated data. This action cannot be undone.",
                      )}
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={updateActiveStatus.isPending}
                      onClick={handleDeleteUser}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {updateActiveStatus.isPending
                        ? translations("Deleting")
                        : translations("Delete User")}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={closeDialog}>
            {translations("Cancel")}
          </Button>
          <Button
            className="bg-[#2E5BFF] hover:bg-[#2549d8]"
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending || updateMemberProfile.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateProfile.isPending || updateMemberProfile.isPending
              ? translations("Saving")
              : translations("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
