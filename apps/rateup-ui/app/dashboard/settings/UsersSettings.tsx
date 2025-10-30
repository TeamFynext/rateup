import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  Mail,
  MessageCircle,
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
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useAllTeamsMembersOfOrg,
  useUpdateRoleMutation,
} from "@/backend/org/org.query";
import { inviteTeamMember } from "@/backend/team/team.api";
import {
  useDeleteInviteMutation,
  userResendInviteTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import {
  useUpdateActiveStatusMutation,
  useUpdateUserPause,
} from "@/backend/user/user.query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";
import { showErrorToast } from "@/utils/notifications";
import { getOrgIdRole, getUserID } from "@/utils/userInfo";

type SelectedUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  teams?: any[];
  status?: string;
};

export default function UsersPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SelectedUser>({});
  const translations = useTranslations();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAllTeamsMembersOfOrg();
  console.log("data", data);
  // Fetch Teams
  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: refetchTeams,
  } = useTeamsByUser();

  // Form setup
  const userForm = useForm({
    initialValues: {
      name: "",
      email: "",
      team: "none",
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name is too short";
        return null;
      },
      email: (value) => {
        if (!value.trim()) return "Email is required";
        if (!/^\S+@\S+$/.test(value))
          return "Please enter a valid email address";
        return null;
      },
    },
  });

  const teamID = "";

  const deleteInviteMutation = useDeleteInviteMutation(teamID);
  const resendInviteMutation = userResendInviteTeamMutation();

  // 🧩 Handle Resend Invite
  const handleResendInvite = async (inviteId: string) => {
    try {
      notifications.show({
        id: "load-data-invitation",
        loading: true,
        title: translations("Resending Invitation"),
        message: translations("Hold on, Team Invitation is being resent."),
        autoClose: false,
        withCloseButton: false,
      });

      await resendInviteMutation.mutateAsync(inviteId);

      notifications.update({
        id: "load-data-invitation",
        color: "green",
        title: translations("Invitation Resent"),
        message: translations(
          "The team invitation has been resent successfully.",
        ),
        autoClose: 2000,
      });
    } catch (error) {
      showErrorToast(
        translations("Team Invitation Resend Failed"),
        "load-data-invitation",
        "",
        true,
      );
    }
  };

  // 🧩 Handle Delete Invite
  const handleDeleteInvite = async (inviteId: string) => {
    try {
      notifications.show({
        id: "load-data-deleting",
        loading: true,
        title: translations("Deleting Invite"),
        message: translations("Hold on, Staff invite is getting deleted."),
        autoClose: false,
        withCloseButton: false,
      });

      await deleteInviteMutation.mutateAsync(inviteId);

      notifications.update({
        id: "load-data-deleting",
        color: "green",
        title: translations("Invite Deleted"),
        message: translations(
          "The staff invite has been deleted successfully.",
        ),
        autoClose: 2000,
      });
    } catch (error) {
      showErrorToast(
        translations("Team Invitation Deletion Failed"),
        "load-data-deleting",
        "",
        true,
      );
    }
  };

  // Auto-select first team by default
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
    const data = {
      name: userForm.values.name,
      email: userForm.values.email,
      orgId,
      invitedBy: userId,
      teamId: userForm.values.team === "none" ? null : userForm.values.team,
      type: "TEAM",
    };
    return (await inviteTeamMember(data)).data;
  };

  const addResourceMutation = useMutation({
    mutationFn: () => handleMemberInvite(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      notifications.show({
        color: "teal",
        title: translations("success"),
        message: data?.existing
          ? translations("Staff added successfully")
          : translations("Invite sent successfully"),
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      userForm.reset();
      setIsAddUserDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error creating invite:", error?.response?.data);
      notifications.show({
        color: "red",
        title: translations("Failed"),
        message: error?.response?.data?.message || error.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });

  return (
    <div>
      <div>
        <h2 className="text-2xl mb-1">User Management</h2>
        <p className="text-sm text-muted-foreground">
          Add and manage users with different access levels
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          {/* Add User Dialog */}
          <Dialog
            open={isAddUserDialogOpen}
            onOpenChange={setIsAddUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-rateup-blue to-rateup-blue h-10">
                <Plus className="w-4 h-4 mr-2" />
                Add New User
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rateup-blue to-rateup-orange flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  Add New User
                </DialogTitle>
                <DialogDescription>
                  Create a new user account and assign roles and team
                  membership.
                </DialogDescription>
              </DialogHeader>

              {/* Form Content */}
              <form
                onSubmit={userForm.onSubmit(() => addResourceMutation.mutate())}
                className="space-y-4 py-3"
              >
                <div className="flex flex-col gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-name" className="text-xs">
                      Full Name <span className="text-red-500">*</span>
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

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-email" className="text-xs">
                      Email Address <span className="text-red-500">*</span>
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
                    {userForm.errors.name && (
                      <p className="text-xs text-red-500 mt-1">
                        {userForm.errors.email}
                      </p>
                    )}
                  </div>

                  {/* Team Assignment */}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-team" className="text-xs">
                      Team Assignment
                    </Label>

                    <Select
                      value={userForm.values.team}
                      onValueChange={(value) =>
                        userForm.setFieldValue("team", value)
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>

                      <SelectContent>
                        {teamsDataUser?.data?.map((team) => (
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
                  </div>

                  {/* Extra Settings */}
                  <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs mb-0">Send welcome email</Label>
                      <Switch defaultChecked disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs mb-0">
                        Require password change
                      </Label>
                      <Switch defaultChecked disabled />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <DialogFooter className="flex items-center justify-end gap-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddUserDialogOpen(false);
                      userForm.reset();
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={addResourceMutation.isPending}
                    className="bg-gradient-to-r from-rateup-blue to-rateup-blue"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {addResourceMutation.isPending ? "Creating" : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10 h-10"
            />
          </div>
        </div>
      </Card>
      {/* Users Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* --- ACTIVE MEMBERS --- */}
        {data?.data?.members?.length > 0 && (
          <>
            <h3 className="col-span-full text-sm font-semibold text-gray-500 uppercase">
              Active Members
            </h3>
            <div className="flex items-center gap-4">
              {data?.data?.members.map((user) => (
                <Card
                  key={user.id}
                  className="p-3 shadow-sm border-gray-200 hover:shadow-md hover:border-rateup-blue/30 transition-all group relative min-w-[15vw] max-w-[15vw]"
                >
                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    {/* Avatar */}
                    <div className="relative mb-2">
                      <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {user.status === "online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    <h4 className="text-sm mb-1 group-hover:text-rateup-blue transition-colors line-clamp-1">
                      {user.name}
                    </h4>

                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1 w-full">
                      {user.email}
                    </p>

                    <Badge className="text-[10px] h-5 px-2 mb-2">
                      {user.role}
                    </Badge>

                    {/* Team info */}
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />
                      <span className="line-clamp-1">
                        {user.teams.map((t) => t.team_name).join(", ")}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs mt-1"
                      disabled={user?.role === UserRole.SUPADM}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setIsEditUserDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit Profile
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* --- PENDING INVITATIONS --- */}
        {data?.data?.invitations?.length > 0 && (
          <>
            <h3 className="col-span-full text-sm font-semibold text-gray-500 uppercase mt-6">
              Pending Invitations
            </h3>
            <div className="flex items-center gap-4">
              {data?.data?.invitations.map((invite) => (
                <Card
                  key={invite.id}
                  className="p-3 max-w-[15vw] min-w-[15vw] border-dashed border-gray-300 hover:border-rateup-orange/40 hover:shadow-md transition-all group relative"
                >
                  <div className="flex flex-col items-center text-center justify-center gap-1">
                    <Avatar className="w-16 h-16 border-2 border-gray-100 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-rateup-orange to-yellow-500 text-white">
                        {invite.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
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

                    {/* Team info */}
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-2">
                      <Users className="w-3 h-3" />
                      <span className="line-clamp-1">
                        {invite.teams.map((t) => t.team_name).join(", ")}
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
                      Resend Invite
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
                      Delete Invite
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
        translations={translations}
      />
    </div>
  );
}

function EditMember({
  isEditUserDialogOpen,
  setIsEditUserDialogOpen,
  selectedUser,
  setSelectedUser,
  translations,
}) {
  const updatePauseStatus = useUpdateUserPause();
  const updateRole = useUpdateRoleMutation();
  const [role, setRole] = useState(selectedUser?.role);
  const { user } = useUser();

  function onChangeRole(id: string, role: string) {
    const data = { memberId: id, body: { role: role } };
    updateRole.mutate(data);
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Updating role"),
      message: translations("Hold on, your changes are getting updated"),
      autoClose: false,
      withCloseButton: false,
    });
  }

  const handleUserStatus = () => {
    const data = {
      isPaused: !selectedUser.isPaused,
      pausedBy: "org",
    };
    updatePauseStatus.mutate(
      { userId: selectedUser.id, data },
      {
        onSuccess: () => {
          setIsEditUserDialogOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rateup-blue to-rateup-orange flex items-center justify-center">
              <Pencil className="w-4 h-4 text-white" />
            </div>
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information, role, and account settings.
          </DialogDescription>
        </DialogHeader>
        {selectedUser && (
          <div className="flex items-center justify-around">
            {/* Left: Profile Picture */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-32 h-32 ring-2 ring-gray-200">
                {/* {profileImage ? (
                        <AvatarImage src={profileImage} />
                      ) : ( */}
                <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white">
                  <User className="w-12 h-12" />
                </AvatarFallback>
                {/* )} */}
              </Avatar>

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedUser.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedUser?.status}
                </span>
              </div>
            </div>

            {/* Right: Form Fields */}
            <div className="space-y-3">
              {/* Basic Information */}

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  defaultValue={selectedUser?.name}
                  className="h-9"
                  disabled
                  readOnly
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email" className="text-xs">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    defaultValue={selectedUser?.email}
                    className="h-9 pl-9"
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Account Status</Label>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedUser.isPaused === true
                          ? "bg-gray-400"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-sm">
                      {selectedUser.isPaused === true ? "Paused" : "Active"}
                    </span>
                  </div>
                  <Switch
                    defaultChecked={selectedUser.isPaused === false}
                    onClick={handleUserStatus}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select
                  value={role}
                  onValueChange={(newRole) => {
                    setRole(newRole);
                    onChangeRole(selectedUser.id, newRole);
                  }}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue
                      defaultValue={selectedUser?.role}
                      placeholder="Select role"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.SUPADM}>
                      {translations("Super Admin")}
                    </SelectItem>
                    <SelectItem value={UserRole.ADM}>
                      {translations("Admin")}
                    </SelectItem>
                    <SelectItem value={UserRole.MEMBER}>
                      {translations("Staff")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setIsEditUserDialogOpen(false);
              setSelectedUser(null);
              // setProfileImage(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-rateup-blue to-rateup-blue"
            onClick={() => {
              setIsEditUserDialogOpen(false);
              setSelectedUser(null);
              // setProfileImage(null);
              // toast.success("User updated successfully!");
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
