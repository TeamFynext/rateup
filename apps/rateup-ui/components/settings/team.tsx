import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2, Users, X } from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useAddUsertoTeams,
  useDeleteTeamMutation,
  useEditTeamMutation,
  useNotTeamMembers,
  useRemoveUserFromTeam,
  useTeamMembersFromInvitation,
} from "@/backend/team/team.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/utils/enums";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

export let colorArray = [
  { from: "#3B82F6", to: "#2563EB" }, // Blue
  { from: "#F97316", to: "#EA580C" }, // Orange
  { from: "#22C55E", to: "#16A34A" }, // Green
  { from: "#A855F7", to: "#9333EA" }, // Purple
  { from: "#EC4899", to: "#DB2777" }, // Pink
  { from: "#EAB308", to: "#CA8A04" }, // Yellow
  { from: "#6366F1", to: "#4F46E5" }, // Indigo
];

export function EditTeam({
  selectedTeam,
  editedColor,
  setIsManageTeamDialogOpen,
  setEditedColor,
}) {
  const translations = useExtracted();
  const editTeamForm = useForm({
    initialValues: {
      name: "",
      code: "",
      color: "",
    },

    validate: {
      name: (value) => {
        if (value.length < 3) {
          return translations("Team Name should be at least 3 characters long");
        }
        return null;
      },

      code: (value) => {
        if (value.length < 2) {
          return translations("Team Code should be at least 2 characters long");
        }

        if (/\s/.test(value)) {
          const suggested = value.trim().replace(/\s+/g, "-");
          return (
            <p className="flex gap-1">
              {translations("Spaces are not allowed, try")} "{suggested}"
            </p>
          );
        }

        if (!/^[A-Za-z0-9-]+$/.test(value)) {
          return translations(
            "Team Code can contain only alphabets, numbers, and hyphens",
          );
        }

        return null;
      },
    },
  });

  const id = selectedTeam.id;
  const [isLoading, setIsLoading] = useState(false);
  const editTeam = useEditTeamMutation(id, setIsLoading);

  useEffect(() => {
    if (selectedTeam) {
      editTeamForm.setValues({
        name: selectedTeam.name || "",
        code: selectedTeam.code || "",
        color: selectedTeam.color || "blue",
      });
      setEditedColor(selectedTeam.color || "blue");
    }
  }, [selectedTeam]);

  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values.name?.trim(),
      code: values.code?.trim(),
      color: values.color?.trim(),
    };
    editTeam.mutate(data, {
      onSuccess: (res) => {
        setIsLoading(false);
      },
    });
  };

  return (
    <form
      onSubmit={editTeamForm.onSubmit(onSubmit)}
      className="flex flex-col gap-4 min-h-[calc(45vh-2rem)]"
    >
      <div className="flex-1 space-y-4">
        {/* Team Name */}
        <div className="space-y-2">
          <Label htmlFor="edit-team-name">{translations("Team Name")}</Label>
          <Input
            id="edit-team-name"
            placeholder={translations("Enter Team name")}
            {...editTeamForm.getInputProps("name")}
            className="border-2 border-gray-200 focus:border-rateup-blue"
          />
          {editTeamForm.errors.name && (
            <p className="text-xs text-red-500">{editTeamForm.errors.name}</p>
          )}
        </div>

        {/* Team Code */}
        <div className="space-y-2">
          <Label htmlFor="edit-team-code">{translations("Team Code")}</Label>
          <Input
            id="edit-team-code"
            placeholder={translations("Enter Team code")}
            {...editTeamForm.getInputProps("code")}
            className="border-2 border-gray-200 focus:border-rateup-blue"
          />
          {editTeamForm.errors.code && (
            <p className="text-xs text-red-500">{editTeamForm.errors.code}</p>
          )}
        </div>

        {/* Team Color */}
        <div className="space-y-2">
          <Label>{translations("Team Color")}</Label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {colorArray.map((color, index) => {
              const isSelected = editedColor === color.from;
              return (
                <button
                  key={index}
                  type="button"
                  className={`w-12 h-12 shrink-0 rounded-lg border-2 ${
                    isSelected ? "border-black scale-105" : "border-transparent"
                  } transition-all hover:scale-105`}
                  style={{
                    background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                  }}
                  onClick={() => {
                    setEditedColor(color.from);
                    editTeamForm.setFieldValue("color", color.from);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between w-full">
        <Button
          variant="outline"
          type="button"
          onClick={() => setIsManageTeamDialogOpen(false)}
        >
          {translations("Cancel")}
        </Button>

        <Button type="submit" disabled={isLoading} className="bg-primary">
          {isLoading ? translations("Saving") : translations("Save Changes")}
        </Button>
      </div>
    </form>
  );
}

export function AddMembers({ selectedTeam, refetchTeams }) {
  const translations = useExtracted();
  const teamID = selectedTeam.id;
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { isLoading: isLoadingNotTeamsUser, data: notTeamMembersData } =
    useNotTeamMembers(teamID);

  const { isLoading: isLoadingMembers, data: teamsMembersData } =
    useTeamMembersFromInvitation(teamID);

  const addTeams = useAddUsertoTeams();

  const teamMembersObjArr = [
    ...(teamsMembersData?.invitations || []),
    ...(teamsMembersData?.members || []),
  ];
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b gap-2 sm:gap-0">
        {isLoadingMembers ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <p className="text-sm sm:text-base text-muted-foreground">
            {teamMembersObjArr?.length || 0}{" "}
            {(teamMembersObjArr?.length || 0) !== 1
              ? translations("members")
              : translations("member")}{" "}
            {translations("in this team")}
          </p>
        )}
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {translations("Add Member")}
              </span>
              <span className="sm:hidden">{translations("Add")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="p-4">
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle className="text-sm sm:text-base">
                  {translations("Add Members to Team")}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {translations("Select users to add to")} {selectedTeam?.name}
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <ScrollArea className="h-[240px]">
                {isLoadingNotTeamsUser ? (
                  // Skeleton for loading available members
                  <div className="space-y-1">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="w-full py-2 rounded-lg flex items-center justify-between px-6"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2 items-center">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : notTeamMembersData?.data?.length ? (
                  <div className="space-y-1">
                    {notTeamMembersData?.data?.map((user) => (
                      <div
                        key={user.id}
                        className="w-full py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between px-6"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage
                              src={getFileUrlFromKey(user?.profilePhoto)}
                            />
                            <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
                              {user.name?.toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex gap-1 items-center">
                              <p className="text-sm truncate">{user.name}</p>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize shrink-0"
                              >
                                {user.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => {
                            addTeams.mutate({
                              userId: user.id,
                              teamIds: selectedTeam.id,
                              userEmail: user.email,
                            });
                          }}
                          className="cursor-pointer hover:scale-105 hover:bg-white"
                        >
                          <Plus className="w-2 h-2" />
                          {translations("Add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Users className="w-8 h-8 opacity-50" />
                    <p className="text-sm text-center">
                      {translations("All users are already in this team")}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* view members */}
      <ScrollArea className="h-[260px] pr-3">
        {isLoadingMembers ? (
          // Skeleton for loading team members
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 px-3 rounded-lg border"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {teamMembersObjArr?.map((member, i) => (
              <div key={i}>
                <TeamMember
                  member={member}
                  selectedTeam={selectedTeam}
                  refetchTeams={refetchTeams}
                />
              </div>
            ))}
            {(!teamMembersObjArr || teamMembersObjArr.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm ">
                  {translations("No members in this team yet")}
                </p>
                <p className="text-xs">
                  {translations("Click 'Add Member' to get started")}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function TeamMember({ member, selectedTeam, refetchTeams }) {
  const translations = useExtracted();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const removeteam = useRemoveUserFromTeam(selectedTeam.id);

  const removeTeam = (userid) => {
    removeteam.mutate(
      { teamId: selectedTeam.id, userId: userid },
      {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers"] });
          queryClient.invalidateQueries({ queryKey: ["notTeamMembers"] });
          refetchTeams();
        },
      },
    );
  };
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarImage src={getFileUrlFromKey(member?.profilePhoto)} />
          <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
            {member?.name?.toUpperCase().slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex-col min-w-0">
          <div className="flex gap-1">
            <p className="text-sm sm:text-base truncate">{member?.name}</p>
            <div className="flex items-center shrink-0 ">
              {member?.status === "PENDING" ? (
                ""
              ) : (
                <Badge variant="outline" className="text-xs capitalize">
                  {member?.role}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {member.email}
          </p>
        </div>
      </div>
      {member.role !== UserRole.SUPADM && (
        <Button
          size="sm"
          variant="destructive"
          className="flex items-center justify-center gap-1"
          onClick={() => setOpen(true)}
        >
          <X />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove</DialogTitle>
            <DialogDescription>
              {translations("Are you sure to remove this user from")}{" "}
              {selectedTeam?.name}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {translations("Cancel")}
            </Button>
            <Button variant="destructive" onClick={() => removeTeam(member.id)}>
              {translations("Confirm Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeleteTeam({ selectedTeam, setIsManageTeamDialogOpen }) {
  const translations = useExtracted();
  const teamId = selectedTeam.id;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteTeamMutation = useDeleteTeamMutation();

  const { data: teamsMembersData } = useTeamMembersFromInvitation(teamId);

  const form = useForm({
    initialValues: {
      googleLink: teamsMembersData?.googleLink || "",
    },
    validate: {
      googleLink: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : translations("Please enter a valid url (https://...)"),
    },
  });

  useEffect(() => {
    if (teamsMembersData?.googleLink) {
      form.setValues({
        googleLink: teamsMembersData?.googleLink,
      });
    }
  }, [teamsMembersData?.googleLink]);

  const editTeamMutation = useEditTeamMutation(teamId, () => {});

  function handleSave() {
    const res = form.validate();
    if (res.hasErrors) {
      return;
    }
    editTeamMutation.mutate(form.values);
  }
  const handleDeleteTeam = async (deleteTeamId: string) => {
    setIsDeleting(true);
    toast.loading(translations("Hold on, Your team is getting deleted"), {
      id: "load-data",
    });
    deleteTeamMutation.mutate(deleteTeamId, {
      onSuccess: () => {
        setIsDeleting(false);
        setIsDialogOpen(false);
        setIsManageTeamDialogOpen(false);
      },
    });
  };
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="google-link">
          {translations("Google review link")}
        </Label>
        <div>
          <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
            <Input
              id="google-link"
              placeholder={translations("Enter google link")}
              {...form.getInputProps("googleLink")}
              className="border-2 border-gray-200 focus:border-rateup-blue"
            />
            <Button
              size="sm"
              className="bg-primary min-w-full sm:min-w-18"
              onClick={handleSave}
              disabled={editTeamMutation.isPending}
            >
              {editTeamMutation.isPending ? <Clock /> : translations("Save")}
            </Button>
          </div>
          {form.errors.googleLink && (
            <p className="text-xs text-red-600 mt-1">
              {form.errors.googleLink}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex flex-col gap-2 items-start">
            <div>
              <h4 className="text-sm font-medium text-red-700">Delete Team</h4>
              <p className="text-xs text-muted-foreground">
                {translations(
                  "Permanently delete this team? Team members will remain in your organization",
                )}{" "}
                .
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer hover:bg-red-700 transition-colors"
              onClick={() => setIsDialogOpen(true)}
            >
              {translations("Delete Team")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm border border-red-200 bg-red-50">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {translations("Confirm Deletion")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {translations("This action")}
              <strong>{translations("cannot be undone")}.</strong>{" "}
              {translations(
                "Are you sure you want to permanently delete this team",
              )}
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              className="text-sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              {translations("Cancel")}
            </Button>
            <Button
              variant="destructive"
              className="text-sm hover:bg-red-700"
              onClick={() => handleDeleteTeam(teamId)}
              disabled={isDeleting}
            >
              {isDeleting ? translations("Deleting") : translations("Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TeamChannelPermissions({ selectedTeam }) {
  const translations = useExtracted();
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const editTeamMutation = useEditTeamMutation(
    selectedTeam.id,
    setIsUpdating,
    undefined,
    true, // use this to avoid triggering full team update if possible, although our backend handles it
  );

  useEffect(() => {
    if (selectedTeam?.whatsappChannels) {
      setSelectedChannels(selectedTeam.whatsappChannels.map((c: any) => c.id));
    }
  }, [selectedTeam]);

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId],
    );
  };

  const handleSave = () => {
    setIsUpdating(true);
    editTeamMutation.mutate({
      whatsappChannels: selectedChannels.map((id) => ({ id })),
    });
  };

  if (isLoadingSettings) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {translations("Inbox Channels Visibility")}
        </h4>
        <Button size="sm" onClick={handleSave} disabled={isUpdating}>
          {isUpdating ? translations("Saving") : translations("Save")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {translations(
          "Select the WhatsApp and Instagram channels this team can access. If none are selected, the team will have access to all channels by default.",
        )}
      </p>
      <ScrollArea className="h-[250px] border rounded-md p-3">
        <div className="space-y-3">
          {waSettings?.map((setting: any) => (
            <div
              key={setting.id}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Checkbox
                id={`channel-${setting.id}`}
                checked={selectedChannels.includes(setting.id)}
                onCheckedChange={() => handleToggleChannel(setting.id)}
              />
              <div className="grid gap-1 leading-none">
                <Label
                  htmlFor={`channel-${setting.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {setting.phone || setting.phoneId}
                </Label>
                {setting.igUserName && (
                  <p className="text-xs text-muted-foreground">
                    Instagram: {setting.igUserName}
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!waSettings || waSettings.length === 0) && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {translations("No channels found")}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
