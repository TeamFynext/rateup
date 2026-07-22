import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubscription } from "@/backend/subscription/subscription.query";
import {
  useAddUsertoTeams,
  useDeleteTeamMutation,
  useEditTeamMutation,
  useNotTeamMembers,
  useRemoveUserFromTeam,
  useTeamChannels,
  useTeamFeatures,
  useTeamMembersFromInvitation,
  useUpdateTeamChannels,
  useUpdateTeamFeatures,
} from "@/backend/team/team.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import { SubscriptionFeaturePathName as sfpn, TeamFeature } from "@/types/enums.ts";
import { UserRole } from "@/utils/enums/index.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { Card, CardContent } from "../ui/card.tsx";

export const colorArray = [
  { from: "#3B82F6", to: "#2563EB" }, // Blue
  { from: "#F97316", to: "#EA580C" }, // Orange
  { from: "#22C55E", to: "#16A34A" }, // Green
  { from: "#A855F7", to: "#9333EA" }, // Purple
  { from: "#EC4899", to: "#DB2777" }, // Pink
  { from: "#EAB308", to: "#CA8A04" }, // Yellow
  { from: "#6366F1", to: "#4F46E5" }, // Indigo
];

export function EditTeam({ selectedTeam }) {
  const { t: translations } = useTranslation();

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
  const editedColor = form.watch("color");
  return (
    <Card className="p-4">
      <h2 className="text-xl">{translations("Team Settings")}</h2>
      <p className="text-sm text-muted-foreground">
        {translations("Configure team details and preferences")}
      </p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        <Field>
          <FieldLabel>{translations("Team Color")}</FieldLabel>
          <div className="flex gap-3 flex-wrap">
            {colorArray.map((color, index) => {
              const isSelected = editedColor === color.from;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    form.setValue("color", color.from);
                  }}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    isSelected ? "ring-4 ring-offset-2 ring-ring scale-105" : ""
                  } hover:scale-110`}
                  style={{
                    background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                  }}
                />
              );
            })}
          </div>
        </Field>

        {/* Created Date */}
        {selectedTeam?.createdAt && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {translations("Created on")} {dayjs(selectedTeam.createdAt).format("MMM D, YYYY")}
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
  const { t: translations } = useTranslation();
  const teamID = selectedTeam;
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { isLoading: isLoadingNotTeamsUser, data: notTeamMembersData } = useNotTeamMembers(teamID);
  const queryClient = useQueryClient();
  const removeteam = useRemoveUserFromTeam(selectedTeam);

  const getRoleStyles = (role) => {
    switch (role) {
      case UserRole.SUPADM:
        return {
          icon: Crown,
          className: "bg-secondary text-secondary-foreground border-border",
        };

      case UserRole.ADM:
        return {
          icon: Shield,
          className: "bg-accent text-accent-foreground border-border",
        };

      case UserRole.MEMBER:
      default:
        return {
          icon: User,
          className: "bg-muted text-foreground border-border",
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
        {notTeamMembersData?.data?.map((user) => (
          <div
            key={user.id}
            className="w-full py-2 rounded-lg flex items-center justify-between px-6"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={getFileUrlFromKey(user?.profilePhoto)} />
                <AvatarFallback className="bg-primary text-white text-xs">
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
    );
  } else {
    addTeamMembersContent = (
      <div className="text-center py-6 text-muted-foreground">
        {translations("All users are already in this team")}
      </div>
    );
  }

  let membersGridContent: React.ReactNode;
  if (isLoadingMembers) {
    membersGridContent = Array.from({ length: 6 }).map((_, index) => (
      <Card key={index} className="p-5">
        <Skeleton className="h-20 w-full" />
      </Card>
    ));
  } else if (teamMembersObjArr?.length) {
    membersGridContent = teamMembersObjArr.map((member, _i) => {
      const isMemberActive = Boolean(member?.active);
      let memberStatusClassName = "text-muted-foreground";
      let memberStatusLabel = translations("Inactive");

      if (isMemberActive) {
        memberStatusClassName = "text-primary";
        memberStatusLabel = translations("Active");
      }

      return (
        <Card key={member?.id} className="p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={getFileUrlFromKey(member?.profilePhoto)} />
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
              <Button variant="destructive" onClick={() => setMemberToDelete(member)}>
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
                  {translations("Joined")} {dayjs(member.createdAt).format("MMM D, YYYY")}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{translations("Status")}</span>

              {/* Active boolean handling */}
              <span className={memberStatusClassName}>{memberStatusLabel}</span>
            </div>
          </div>
        </Card>
      );
    });
  } else {
    membersGridContent = (
      <div className="col-span-full text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto opacity-30" />
        <p>{translations("No members in this team yet")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{translations("Team Members")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations("Manage who has access to this team")}
          </p>
        </div>

        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="w-4 h-4 mr-2" />
            {translations("Add Member")}
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

              <ScrollArea className="h-60">{addTeamMembersContent}</ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Members Grid */}
      <ScrollArea className="h-[calc(100vh-275px)] min-h-64 p-1">
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {membersGridContent}
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
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
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
  }, [form, teamsMembersData.googleLink]);
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
        navigate({
          to: "/dashboard/settings/team",
        });
      },
    });
  };

  return (
    <>
      {/* FORM */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Controller
          name="googleLink"
          control={form.control}
          rules={{
            validate: (value) =>
              value.startsWith("https://") ||
              value === "" ||
              translations("Please enter a valid url (https://...)"),
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="google-link">{translations("Google review link")}</FieldLabel>
              <div className="flex flex-col items-center justify-between gap-1 sm:flex-row">
                <Input
                  {...field}
                  id="google-link"
                  placeholder={translations("Enter google link")}
                  aria-invalid={fieldState.invalid}
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </form>

      {/* DELETE SECTION */}
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <Trash2 className="h-5 w-5 shrink-0 text-destructive" />
          <div className="flex flex-col gap-2 items-start">
            <div>
              <h4 className="text-sm font-medium text-destructive">
                {translations("Delete Team")}
              </h4>
              <p className="text-xs text-muted-foreground">
                {translations(
                  "Permanently delete this team? Team members will remain in your organization",
                )}
                .
              </p>
            </div>

            <Button variant="destructive" size="sm" onClick={() => setIsDialogOpen(true)}>
              {translations("Delete Team")}
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm border-destructive/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5 text-destructive" />
              {translations("Confirm Deletion")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {translations("This action")} <strong>{translations("cannot be undone")}.</strong>{" "}
              {translations("Are you sure you want to permanently delete this team")}?
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
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

const FEATURES_WITH_SUBSCRIPTION: {
  feature: TeamFeature;
  label: string;
  requiredSubscriptions?: sfpn[];
}[] = [
  {
    feature: TeamFeature.Inbox,
    label: "Inbox",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  { feature: TeamFeature.Analytics, label: "Analytics" },
  {
    feature: TeamFeature.Contacts,
    label: "Contacts",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Campaigns,
    label: "Campaigns",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Flows,
    label: "Flows",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Chatbots,
    label: "Chatbots",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Templates,
    label: "Templates",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Automation,
    label: "Automation",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.Loyalty,
    label: "Loyalty",
    requiredSubscriptions: [sfpn.Whatsapp],
  },
  {
    feature: TeamFeature.WebForms,
    label: "Web Forms / Surveys",
    requiredSubscriptions: [sfpn.WebSurvey],
  },
  {
    feature: TeamFeature.Tickets,
    label: "Tickets",
  },
  { feature: TeamFeature.QrStudio, label: "QR Studio" },
  {
    feature: TeamFeature.AiChatbot,
    label: "Chatbot (AI)",
    requiredSubscriptions: [sfpn.AI],
  },
  { feature: TeamFeature.AppsServices, label: "Apps & Services" },
  { feature: TeamFeature.Settings, label: "Settings" },
];

export function TeamFeatureAccess({ selectedTeam }) {
  const { t: translations } = useTranslation();
  const teamId = selectedTeam?.id as string;

  const { data, isLoading } = useTeamFeatures(teamId);
  const updateMutation = useUpdateTeamFeatures(teamId);
  const { data: subscription } = useSubscription();

  const availableFeatures = FEATURES_WITH_SUBSCRIPTION.filter(
    ({ requiredSubscriptions }) =>
      !requiredSubscriptions || requiredSubscriptions.every((sfp) => hasFeature(subscription, sfp)),
  );

  const serverChecked = useMemo(
    () => new Set((data?.features || []).map((f) => f.feature)),
    [data],
  );
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const checked = useMemo(() => {
    const next = new Set(serverChecked);

    Object.entries(pendingToggles).forEach(([feature, isEnabled]) => {
      if (isEnabled) next.add(feature);
      else next.delete(feature);
    });

    return next;
  }, [pendingToggles, serverChecked]);

  const handleToggle = (feature: string) => {
    setPendingToggles((prev) => ({
      ...prev,
      [feature]: !(prev[feature] ?? serverChecked.has(feature)),
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(Array.from(checked), {
      onSuccess: () => {
        setPendingToggles({});
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={`feat-skel-${i}`} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{translations("Feature Access")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations(
              "Select which features this team can access. Org owners always have full access.",
            )}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? translations("Saving") : translations("Save Changes")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableFeatures.map(({ feature, label }) => (
              <div
                key={feature}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{label}</span>
                <Switch
                  checked={checked.has(feature)}
                  onCheckedChange={() => handleToggle(feature)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Best available human-readable name for a channel, with the platform it belongs to. */
function describeChannel(channel: any): { label: string; platform: string } {
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

export function TeamChannelAccess({ selectedTeam }) {
  const { t: translations } = useTranslation();
  const teamId = selectedTeam?.id as string;

  const { data, isLoading } = useTeamChannels(teamId);
  const { data: allChannelsList, isLoading: isLoadingChannels } = useWaSettings();
  const updateMutation = useUpdateTeamChannels(teamId);

  // `null` means "no local edits yet" — the server value is shown until the user touches something.
  const [draft, setDraft] = useState<{ allChannels: boolean; ids: Set<string> } | null>(null);

  const serverState = useMemo(
    () => ({
      allChannels: data?.allChannels ?? true,
      ids: new Set<string>((data?.channels ?? []).map((c) => c.id)),
    }),
    [data],
  );

  const current = draft ?? serverState;
  const isDirty = draft !== null;

  const toggleChannel = (channelId: string) => {
    const ids = new Set(current.ids);
    if (ids.has(channelId)) ids.delete(channelId);
    else ids.add(channelId);
    setDraft({ allChannels: false, ids });
  };

  const handleSave = () => {
    updateMutation.mutate(
      { allChannels: current.allChannels, channelIds: Array.from(current.ids) },
      { onSuccess: () => setDraft(null) },
    );
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl mb-1">{translations("Channel Access")}</h2>
          <p className="text-sm text-muted-foreground">
            {translations(
              "Choose which channels this team can see. Org owners always see every channel.",
            )}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || !isDirty}>
          {updateMutation.isPending ? translations("Saving") : translations("Save Changes")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div>
              <span>{translations("All channels")}</span>
              <p className="text-xs text-muted-foreground">
                {translations("Includes any channel connected in the future.")}
              </p>
            </div>
            <Switch
              checked={current.allChannels}
              onCheckedChange={(checked) =>
                setDraft({ allChannels: checked, ids: checked ? new Set() : current.ids })
              }
            />
          </div>

          {!current.allChannels && (
            <>
              <Separator />
              {channels.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1 py-2">
                  {translations("No channels are connected to this organisation yet.")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {channels.map((channel: any) => {
                    const { label, platform } = describeChannel(channel);
                    return (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="block truncate">{label}</span>
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            {platform}
                          </Badge>
                        </div>
                        <Switch
                          checked={current.ids.has(channel.id)}
                          onCheckedChange={() => toggleChannel(channel.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {hasNoGrant && (
                <p className="text-sm text-destructive px-1">
                  {translations(
                    "No channels selected — members of this team will not see any channel.",
                  )}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
