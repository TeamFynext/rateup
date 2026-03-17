"use client";

import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useExtracted } from "next-intl";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import {
  useAllTeamsMembersOfOrg,
  useUpdateRoleMutation,
} from "@/backend/org/org.query";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CustomAlertDialog from "@/components/ui/custom/CustomAlertDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserRole } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { getOrgIdRole, getUserID } from "@/utils/userInfo";

type SelectedUser = {
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
};

type TeamOption = {
  id: string;
  name: string;
  color?: string;
};

export default function UsersPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const translations = useExtracted();
  const queryClient = useQueryClient();
  const { data } = useAllTeamsMembersOfOrg();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [newUserProfileImage, setNewUserProfileImage] = useState<string | null>(
    null,
  );
  const [newUserPhone, setNewUserPhone] = useState("");

  // Fetch Teams
  const { isLoading: isLoadingTeamsUser, data: teamsDataUser } =
    useTeamsByUser();

  // Form setup
  const userForm = useForm({
    initialValues: {
      name: "",
      email: "",
      team: "none",
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return translations("Name is required");
        if (value.trim().length < 2) return translations("Name is too short");
        return null;
      },
      email: (value) => {
        if (!value.trim()) return translations("Email is required");
        if (!/^\S+@\S+$/.test(value))
          return translations("Please enter a valid email address");
        return null;
      },
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
        toast.success(
          translations("The team invitation has been resent successfully."),
          {
            id: "load-data-invitation",
          },
        );
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
        toast.success(
          translations("The staff invite has been deleted successfully."),
          {
            id: "load-data-deleting",
          },
        );
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
      const [{ role }, { userId }] = await Promise.all([
        getOrgIdRole(),
        getUserID(),
      ]);
      setCurrentUserRole(role || "");
      setCurrentUserId(userId || "");
    };

    loadViewerInfo();
  }, []);

  useEffect(() => {
    const teams = teamsDataUser?.data;
    if (teams && teams.length > 0) {
      userForm.setFieldValue("team", teams[0].id);
    } else {
      userForm.setFieldValue("team", "none");
    }
  }, [teamsDataUser]);

  const handleMemberInvite = async () => {
    const { orgId } = await getOrgIdRole();
    const { userId } = await getUserID();
    const inviteData = {
      name: userForm.values.name,
      email: userForm.values.email,
      orgId,
      invitedBy: userId,
      teamId: userForm.values.team === "none" ? null : userForm.values.team,
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
      toast.error(error?.message || error.message);
    },
  });

  const filteredMembers = data?.data?.members?.filter((member) => {
    const q = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(q) ||
      member.email?.toLowerCase().includes(q)
    );
  });

  const filteredInvitations = data?.data?.invitations?.filter((invite) => {
    const q = searchQuery.toLowerCase();
    return (
      invite.name?.toLowerCase().includes(q) ||
      invite.email?.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (id: string) => {
    const link = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/invite?type=team&token=${id}`;
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
            <DialogTrigger asChild>
              <Button className="bg-[#2E5BFF] hover:bg-[#2549d8] h-10 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                {translations("Add New User")}
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-175">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#2E5BFF] flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  {translations("Add New User")}
                </DialogTitle>
                <DialogDescription>
                  {translations(
                    "Create a new user account and assign roles and team membership",
                  )}
                  .
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={userForm.onSubmit(() => addResourceMutation.mutate())}
                className="space-y-4 py-3"
              >
                <div className="grid grid-cols-[180px_1fr] gap-6">
                  {/* Left: Profile Picture */}
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-32 h-32 ring-2 ring-gray-200">
                      {newUserProfileImage ? (
                        <AvatarImage src={newUserProfileImage} />
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
                            setNewUserProfileImage(
                              loadEvent.target?.result as string,
                            );
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-name" className="text-xs">
                          {translations("Full Name")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="new-name"
                          placeholder="John Doe"
                          className="h-9"
                          {...userForm.getInputProps("name")}
                        />
                        {userForm.errors.name && (
                          <p className="text-xs text-red-500 mt-1">
                            {userForm.errors.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new-phone" className="text-xs">
                          {translations("Phone Number")}
                        </Label>
                        <PhoneInput
                          id="new-phone"
                          placeholder={translations("Enter phone number")}
                          className="h-9"
                          defaultCountry="IN"
                          value={newUserPhone}
                          onChange={(value) => setNewUserPhone(value || "")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="new-email" className="text-xs">
                        {translations("Email Address")}{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="john@company.com"
                          className="h-9 pl-9"
                          {...userForm.getInputProps("email")}
                        />
                      </div>
                      {userForm.errors.email && (
                        <p className="text-xs text-red-500 mt-1">
                          {userForm.errors.email}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-role" className="text-xs">
                          {translations("User Role")}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select defaultValue={UserRole.MEMBER}>
                          <SelectTrigger id="new-role" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.SUPADM}>
                              <div className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-rateup-blue" />
                                <span>{translations("Super Admin")}</span>
                                <Badge className="bg-rateup-blue text-[10px] h-4 px-1.5">
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
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new-team" className="text-xs">
                          {translations("Team Assignment")}
                        </Label>
                        {isLoadingTeamsUser ? (
                          <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
                        ) : (
                          <Select
                            value={userForm.values.team}
                            onValueChange={(value) =>
                              userForm.setFieldValue("team", value)
                            }
                          >
                            <SelectTrigger id="new-team" className="h-9 w-full">
                              <SelectValue
                                placeholder={translations("Select team")}
                              />
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
                      </div>
                    </div>

                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs mb-0">
                          {translations("Send welcome email")}
                        </Label>
                        <Switch defaultChecked disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs mb-0">
                          {translations("Require password change")}
                        </Label>
                        <Switch defaultChecked disabled />
                      </div>
                    </div>
                  </div>
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
                  <Button
                    type="submit"
                    disabled={addResourceMutation.isPending}
                    className="bg-[#2E5BFF] hover:bg-[#2549d8]"
                  >
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
            <h3 className="col-span-full text-sm font-semibold text-gray-500 uppercase">
              {translations("Active Members")}
            </h3>
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4 p-4 flex-wrap">
              {filteredMembers?.map((member: any) => (
                <Card
                  key={member.id}
                  className="p-3 shadow-sm border-gray-200 hover:shadow-md hover:border-rateup-blue/30 transition-all group relative min-w-[15vw] lg:max-w-[15vw]"
                >
                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    <div className="relative mb-2">
                      <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                        <AvatarImage
                          src={getFileUrlFromKey(member.profilePhoto)}
                        />
                        <AvatarFallback className="bg-primary text-white">
                          {member.name?.toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {member.status === "online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <h4 className="text-sm mb-1 group-hover:text-rateup-blue transition-colors line-clamp-1">
                      {member.name}
                    </h4>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1 w-full">
                      {member.email}
                    </p>

                    <Badge className="text-[10px] h-5 px-2 mb-2">
                      {member.role}
                    </Badge>

                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-default">
                            <span className="line-clamp-1">
                              {member?.teams.length === 0
                                ? "Not in any team"
                                : member.teams
                                    .slice(0, 2)
                                    .map((t: any) => t.team_name)
                                    .join(", ")}
                              {member.teams.length > 2 ? "..." : ""}
                            </span>
                          </div>
                        </TooltipTrigger>

                        <TooltipContent className="border shadow-md rounded-lg p-2 text-xs max-w-52">
                          <div className="flex flex-col gap-1">
                            {member.teams.map((t: any) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-2"
                              >
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
                      disabled={
                        currentUserRole !== UserRole.SUPADM &&
                        member?.id !== currentUserId
                      }
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
            <h3 className="col-span-full text-sm font-semibold text-gray-500 uppercase mt-6">
              {translations("Pending Invitations")}
            </h3>
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4 p-4 flex-wrap w-full">
              {filteredInvitations?.map((invite: any) => (
                <Card
                  key={invite.id}
                  className="p-3 lg:max-w-[15vw] min-w-[15vw] border-dashed border-gray-300 hover:border-rateup-orange/40 hover:shadow-md transition-all group relative"
                >
                  <button
                    type="button"
                    className="absolute top-2 right-2 border rounded-sm p-1 hover:text-primary cursor-pointer"
                    onClick={() => handleCopy(invite?.id)}
                    aria-label={translations("Copy")}
                    title={
                      copied ? translations("Copied") : translations("Copy")
                    }
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                      <AvatarFallback className="bg-yellow-500 text-white">
                        {invite?.name?.toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <h4 className="text-sm mb-1 text-rateup-orange line-clamp-1">
                      {invite.name}
                    </h4>

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

type EditMemberProps = Readonly<{
  isEditUserDialogOpen: boolean;
  setIsEditUserDialogOpen: (value: boolean) => void;
  selectedUser: SelectedUser | null;
  setSelectedUser: (user: SelectedUser | null) => void;
  teams: TeamOption[];
  currentUserRole: string;
  currentUserId: string;
  translations: (key: string) => string;
}>;

function EditMember({
  isEditUserDialogOpen,
  setIsEditUserDialogOpen,
  selectedUser,
  setSelectedUser,
  teams,
  currentUserRole,
  currentUserId,
}) {
  const translations = useExtracted();
  const queryClient = useQueryClient();
  const updatePauseStatus = useUpdateUserPause();
  const updateRole = useUpdateRoleMutation();
  const addUserToTeams = useAddUsertoTeams();
  const removeUserFromTeam = useRemoveUserFromTeam("");
  const updateProfile = useUpdateProfileMutation();
  const updateMemberProfile = useUpdateMemberProfileMutation();
  const updateActiveStatus = useUpdateActiveStatusMutation();
  const [role, setRole] = useState<string>(
    selectedUser?.role || UserRole.MEMBER,
  );
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editableName, setEditableName] = useState("");
  const [editablePhone, setEditablePhone] = useState("");
  const [editableGender, setEditableGender] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isUpdatingTeams, setIsUpdatingTeams] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!selectedUser) return;

    setRole(selectedUser.role || UserRole.MEMBER);
    setProfileImage(
      selectedUser.profilePhoto
        ? getFileUrlFromKey(selectedUser.profilePhoto)
        : null,
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

  const handleDeleteUser = () => {
    if (!selectedUser?.id) return;

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
    const teamIdsToAdd = nextTeamIds.filter(
      (teamId) => !previousTeamIds.includes(teamId),
    );
    const teamIdsToRemove = previousTeamIds.filter(
      (teamId) => !nextTeamIds.includes(teamId),
    );

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
            {translations(
              "Update user information, role, and account settings",
            )}
            .
          </DialogDescription>
        </DialogHeader>

        {selectedUser && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="details">
                {translations("User Details")}
              </TabsTrigger>
              <TabsTrigger value="permissions">
                {translations("Permissions")}
              </TabsTrigger>
              <TabsTrigger value="settings">
                {translations("Settings")}
              </TabsTrigger>
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
                        selectedUser.status === "online"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {selectedUser.status || translations("Unknown")}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-gender" className="text-xs">
                      {translations("Title")}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={editableGender}
                      onValueChange={setEditableGender}
                      disabled={!canEditNameAndPhone}
                    >
                      <SelectTrigger id="edit-gender" className="h-9">
                        <SelectValue
                          placeholder={translations("Select title")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Mr</SelectItem>
                        <SelectItem value="FEMALE">Mrs</SelectItem>
                        <SelectItem value="OTHER">Mx</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-xs">
                        {translations("Full Name")}{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-name"
                        value={editableName}
                        onChange={(event) =>
                          setEditableName(event.target.value)
                        }
                        className="h-9"
                        disabled={!canEditNameAndPhone}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="edit-phone" className="text-xs">
                        {translations("Phone Number")}
                      </Label>
                      <PhoneInput
                        id="edit-phone"
                        placeholder={translations("Enter phone number")}
                        className="h-9"
                        defaultCountry="IN"
                        value={editablePhone}
                        onChange={(value) => setEditablePhone(value || "")}
                        disabled={!canEditNameAndPhone}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email" className="text-xs">
                      {translations("Email Address")}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="edit-email"
                        type="email"
                        defaultValue={selectedUser.email}
                        className="h-9 pl-9"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-last-active" className="text-xs">
                      {translations("Last Active")}
                    </Label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {selectedUser.lastActive ||
                          translations("Not available")}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {translations("Account Status")}
                    </Label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            selectedUser.isPaused
                              ? "bg-gray-400"
                              : "bg-green-500"
                          }`}
                        />
                        <span className="text-sm">
                          {selectedUser.isPaused
                            ? translations("Inactive Account")
                            : translations("Active Account")}
                        </span>
                      </div>
                      <Switch
                        checked={!selectedUser.isPaused}
                        onCheckedChange={handleUserStatus}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-xs">
                    {translations("User Role")}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={role}
                    disabled={!canEditAll}
                    onValueChange={(nextRole) => {
                      if (!canEditAll) return;
                      if (!selectedUser.id) return;
                      setRole(nextRole);
                      onChangeRole(selectedUser.id, nextRole);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.SUPADM}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-rateup-blue" />
                          <span>{translations("Super Admin")}</span>
                          <Badge className="bg-rateup-blue text-[10px] h-4 px-1.5">
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-team" className="text-xs">
                    {translations("Team Assignment")}
                  </Label>
                  <MultiSelect
                    options={teamOptions}
                    defaultValue={selectedTeamIds}
                    onValueChange={handleTeamAssignmentChange}
                    placeholder={translations("Select teams")}
                    disabled={!canEditAll || isUpdatingTeams}
                    searchable
                    className="w-full"
                  />
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <Label className="text-xs">
                    {translations("Additional Permissions")}
                  </Label>
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-rateup-blue" />
                        <div>
                          <p className="text-sm">
                            {translations("Access to Inbox")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {translations(
                              "View and respond to customer messages",
                            )}
                          </p>
                        </div>
                      </div>
                      <Switch defaultChecked disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-rateup-orange" />
                        <div>
                          <p className="text-sm">
                            {translations("Manage Automations")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {translations(
                              "Create and edit workflow automation",
                            )}
                          </p>
                        </div>
                      </div>
                      <Switch disabled />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm">
                            {translations("View Analytics")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {translations("Access reports and data insights")}
                          </p>
                        </div>
                      </div>
                      <Switch defaultChecked disabled />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs mb-0">
                    {translations("Email notifications enabled")}
                  </Label>
                  <Switch defaultChecked disabled />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-xs mb-0">
                    {translations("Two-factor authentication")}
                  </Label>
                  <Switch disabled />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-xs mb-0">
                    {translations("Allow mobile app access")}
                  </Label>
                  <Switch defaultChecked disabled />
                </div>
              </div>

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
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {updateActiveStatus.isPending
                        ? translations("Deleting")
                        : translations("Delete User")}
                    </Button>
                    <CustomAlertDialog
                      opened={isDeleteConfirmOpen}
                      setOpened={setIsDeleteConfirmOpen}
                      title={translations("Delete User Account")}
                      description={`${translations("Are you sure you want to delete")} ${selectedUser?.name || translations("this user")}? ${translations("This action cannot be undone.")}`}
                      buttonTitle={translations("Delete User")}
                      buttonColor="bg-destructive hover:bg-destructive/90 text-white"
                      onAction={handleDeleteUser}
                    />
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
