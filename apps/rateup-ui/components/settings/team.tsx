import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Calendar,
  Clock,
  Crown,
  Mail,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { useForm } from "react-hook-form";
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

import { Card } from "../ui/card";

export let colorArray = [
  { from: "#3B82F6", to: "#2563EB" }, // Blue
  { from: "#F97316", to: "#EA580C" }, // Orange
  { from: "#22C55E", to: "#16A34A" }, // Green
  { from: "#A855F7", to: "#9333EA" }, // Purple
  { from: "#EC4899", to: "#DB2777" }, // Pink
  { from: "#EAB308", to: "#CA8A04" }, // Yellow
  { from: "#6366F1", to: "#4F46E5" }, // Indigo
];

export function EditTeam({ selectedTeam }) {
  const translations = useExtracted();
  const [editedColor, setEditedColor] = useState(null);

  const id = selectedTeam.id;
  const [isLoading, setIsLoading] = useState(false);
  const editTeam = useEditTeamMutation(id, setIsLoading);

  const form = useForm({
    defaultValues: {
      name: "",
      code: "",
      color: "",
    },
  });

  // set initial values
  useEffect(() => {
    if (selectedTeam) {
      form.reset({
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
      onSuccess: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl mb-1">{translations("Team Settings")}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {translations("Configure team details and preferences")}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Team Name */}
        <div className="space-y-2">
          <Label htmlFor="team-name">{translations("Team Name")}</Label>
          <Input
            id="team-name"
            placeholder={translations("Enter Team name")}
            {...form.register("name", {
              validate: (value) =>
                value.length >= 3 ||
                translations("Team Name should be at least 3 characters long"),
            })}
            className="h-10 border-2 border-gray-200"
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Team Code */}
        <div className="space-y-2">
          <Label htmlFor="team-code">{translations("Team Code")}</Label>
          <Input
            id="team-code"
            placeholder={translations("Enter Team code")}
            {...form.register("code", {
              validate: (value) => {
                if (value.length < 2) {
                  return translations(
                    "Team Code should be at least 2 characters long",
                  );
                }

                if (/\s/.test(value)) {
                  const suggested = value.trim().replace(/\s+/g, "-");
                  return `${translations("Spaces not allowed, try")} "${suggested}"`;
                }

                if (!/^[A-Za-z0-9-]+$/.test(value)) {
                  return translations(
                    "Team Code can contain only alphabets, numbers, and hyphens",
                  );
                }

                return true;
              },
            })}
            className="h-10 border-2 border-gray-200"
          />
          {form.formState.errors.code && (
            <p className="text-xs text-red-500">
              {form.formState.errors.code.message}
            </p>
          )}
        </div>

        {/* Team Color */}
        <div className="space-y-2">
          <Label>{translations("Team Color")}</Label>
          <div className="flex gap-3 flex-wrap">
            {colorArray.map((color, index) => {
              const isSelected = editedColor === color.from;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setEditedColor(color.from);
                    form.setValue("color", color.from);
                  }}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    isSelected
                      ? "ring-4 ring-offset-2 ring-gray-400 scale-105"
                      : ""
                  } hover:scale-110`}
                  style={{
                    background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Created Date */}
        {selectedTeam?.createdAt && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {translations("Created on")}{" "}
                {dayjs(selectedTeam.createdAt).format("MMM D, YYYY")}
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-end justify-end pt-4">
          <Button type="submit" disabled={isLoading} className="bg-primary">
            {isLoading ? translations("Saving") : translations("Save Changes")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AddMembers({ selectedTeam }) {
  const [memberToDelete, setMemberToDelete] = useState(null);
  const translations = useExtracted();
  const teamID = selectedTeam;
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { isLoading: isLoadingNotTeamsUser, data: notTeamMembersData } =
    useNotTeamMembers(teamID);
  const queryClient = useQueryClient();
  const removeteam = useRemoveUserFromTeam(selectedTeam);

  const getRoleStyles = (role) => {
    switch (role) {
      case UserRole.SUPADM:
        return {
          icon: Crown,
          className: "bg-yellow-100 text-yellow-700 border-yellow-200",
        };

      case UserRole.ADM:
        return {
          icon: Shield,
          className: "bg-purple-100 text-purple-700 border-purple-200",
        };

      case UserRole.MEMBER:
      default:
        return {
          icon: User,
          className: "bg-blue-100 text-blue-700 border-blue-200",
        };
    }
  };

  const removeTeam = (userid) => {
    removeteam.mutate(
      { teamId: selectedTeam, userId: userid },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers"] });
          queryClient.invalidateQueries({ queryKey: ["notTeamMembers"] });
          queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
        },
      },
    );
  };

  const { isLoading: isLoadingMembers, data: teamsMembersData } =
    useTeamMembersFromInvitation(teamID);
  const addTeams = useAddUsertoTeams();

  const teamMembersObjArr = [
    ...(teamsMembersData?.invitations || []),
    ...(teamsMembersData?.members || []),
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{translations("Team Members")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations("Manage who has access to this team")}
          </p>
        </div>

        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              {translations("Add Member")}
            </Button>
          </DialogTrigger>

          {/* Dialog content unchanged */}
          <DialogContent className="p-4">
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle>{translations("Add Team Members")}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {translations("Select members to add")}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <ScrollArea className="h-[240px]">
                {isLoadingNotTeamsUser ? (
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
                ) : notTeamMembersData?.data?.length ? (
                  <div className="space-y-1">
                    {notTeamMembersData?.data?.map((user) => (
                      <div
                        key={user.id}
                        className="w-full py-2 rounded-lg flex items-center justify-between px-6"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={getFileUrlFromKey(user?.profilePhoto)}
                            />
                            <AvatarFallback className="bg-primary text-white text-xs">
                              {user.name?.toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p className="text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() =>
                            addTeams.mutate({
                              userId: user.id,
                              teamIds: [selectedTeam],
                              userEmail: user.email,
                            })
                          }
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {translations("Add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    {translations("All users are already in this team")}
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Grid */}
      <ScrollArea className="h-96 p-1">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingMembers ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="p-5">
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))
            ) : teamMembersObjArr?.length ? (
              teamMembersObjArr.map((member, i) => (
                <Card
                  key={i}
                  className="p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage
                          src={getFileUrlFromKey(member?.profilePhoto)}
                        />
                        <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
                          {member.name?.toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-semibold text-sm">{member.name}</h3>

                        {/* Role only if exists */}
                        {member?.role &&
                          (() => {
                            const roleData = getRoleStyles(member.role);
                            const RoleIcon = roleData.icon;

                            return (
                              <Badge
                                className={`text-xs capitalize flex items-center gap-1 px-2 py-0.5 border ${roleData.className}`}
                              >
                                <RoleIcon className="w-3 h-3" />
                                {member.role}
                              </Badge>
                            );
                          })()}
                      </div>
                    </div>
                    {member?.role !== UserRole.SUPADM && (
                      <Button
                        variant="destructive"
                        onClick={() => setMemberToDelete(member)}
                      >
                        <UserX />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>

                    {/* Phone only if exists */}
                    {member?.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}

                    {/* Joined date formatted with dayjs */}
                    {member?.createdAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {translations("Joined")}{" "}
                          {dayjs(member.createdAt).format("MMM D, YYYY")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {translations("Status")}
                      </span>

                      {/* Active boolean handling */}
                      <span
                        className={
                          member?.active ? "text-green-600" : "text-gray-500"
                        }
                      >
                        {member?.active
                          ? translations("Active")
                          : translations("Inactive")}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto opacity-30" />
                <p>{translations("No members in this team yet")}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      <Dialog
        open={!!memberToDelete}
        onOpenChange={(open) => {
          if (!open) setMemberToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{translations("Remove Member")}</DialogTitle>
            <DialogDescription>
              {translations("Are you sure you want to remove")}{" "}
              <span className="font-semibold">{memberToDelete?.name}</span>{" "}
              {translations("from this team?")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setMemberToDelete(null)}>
              {translations("Cancel")}
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                removeTeam(memberToDelete.id);
                setMemberToDelete(null);
              }}
            >
              {translations("Remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DeleteTeam({ selectedTeam }) {
  const translations = useExtracted();
  const router = useRouter();
  const teamId = selectedTeam.id;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteTeamMutation = useDeleteTeamMutation();
  const { data: teamsMembersData } = useTeamMembersFromInvitation(teamId);
  const editTeamMutation = useEditTeamMutation(teamId, () => {});

  const form = useForm({
    defaultValues: {
      googleLink: "",
    },
  });

  // set default value from API
  useEffect(() => {
    if (teamsMembersData?.googleLink) {
      form.setValue("googleLink", teamsMembersData.googleLink);
    }
  }, [teamsMembersData?.googleLink]);

  const onSubmit = (data) => {
    // simple validation
    if (data.googleLink && !data.googleLink.startsWith("https://")) {
      return;
    }

    editTeamMutation.mutate(data);
  };

  const handleDeleteTeam = async (deleteTeamId: string) => {
    setIsDeleting(true);
    toast.loading(translations("Hold on, Your team is getting deleted"), {
      id: "load-data",
    });

    deleteTeamMutation.mutate(deleteTeamId, {
      onSuccess: () => {
        setIsDeleting(false);
        setIsDialogOpen(false);
        router.push("/dashboard/settings/team");
      },
    });
  };

  return (
    <>
      {/* FORM */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="google-link">
            {translations("Google review link")}
          </Label>

          <div>
            <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
              <Input
                id="google-link"
                placeholder={translations("Enter google link")}
                {...form.register("googleLink", {
                  validate: (value) =>
                    value.startsWith("https://") ||
                    value === "" ||
                    translations("Please enter a valid url (https://...)"),
                })}
                className="border-2 border-gray-200 focus:border-rateup-blue"
              />

              <Button
                size="sm"
                type="submit"
                className="bg-primary min-w-full sm:min-w-18"
                disabled={editTeamMutation.isPending}
              >
                {editTeamMutation.isPending ? <Clock /> : translations("Save")}
              </Button>
            </div>

            {/* ERROR */}
            {form.formState.errors.googleLink && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.googleLink.message}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* DELETE SECTION */}
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex flex-col gap-2 items-start">
            <div>
              <h4 className="text-sm font-medium text-red-700">
                {translations("Delete Team")}
              </h4>
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
              onClick={() => setIsDialogOpen(true)}
            >
              {translations("Delete Team")}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm border border-red-200 bg-red-50">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              {translations("Confirm Deletion")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {translations("This action")}{" "}
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
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              {translations("Cancel")}
            </Button>

            <Button
              variant="destructive"
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
