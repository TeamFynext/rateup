import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { Plus, Trash2, User, Users, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useCreateTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/UserContext";

let colorArray = [
  { from: "#3B82F6", to: "#2563EB" },
  { from: "#F97316", to: "#EA580C" },
  { from: "#22C55E", to: "#16A34A" },
  { from: "#A855F7", to: "#9333EA" },
  { from: "#EC4899", to: "#DB2777" },
];

const Team = () => {
  const translations = useTranslations();
  const [sortOption, setSortOption] = useState("");
  const searchParams = useSearchParams();
  const action = searchParams?.get("action");
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isManageTeamDialogOpen, setIsManageTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [editedColor, setEditedColor] = useState("blue");

  const createTeamForm = useForm({
    initialValues: {
      name: "",
      code: "",
      color: "null",
    },

    validate: {
      name: (value) => {
        if (value.length < 3) {
          return translations("Team Name should be at least 3 characters long");
        }
        return null; // Validation passed
      },
      code: (value) => {
        if (value.length < 2) {
          return translations("Team Code should be at least 2 characters long");
        }
        return null; // Validation passed
      },
    },
  });

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    error: errorTeamsDataUser,
    refetch: refetchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error: any;
    data: TeamsResponse;
    refetch: any;
  };

  const onSubmit = (values) => {
    console.log("triggered onsubmit:", createTeamForm.values);
    handleSubmit(values);
  };

  const createTeamMutation = useCreateTeamMutation(
    setIsCreateTeamDialogOpen,
    createTeamForm,
    setIsCreating,
  );

  const handleSubmit = async (values) => {
    console.log("submitting");
    setIsCreating(true);
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Creating Team.."),
      message: `${translations("Hold on, Your team")} '${values?.name}' ${translations("is getting created.")}`,
      autoClose: false,
      withCloseButton: false,
    });
    createTeamMutation.mutate(values);
  };
  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  //   const onSortChange = (value) => {
  //     setSortOption(value);
  //   };

  console.log(teamsData?.data);

  //   const sortedTeams = () => {
  //     if (!teamsData?.data) return [];

  //     switch (sortOption) {
  //       case "a-z":
  //         return [...teamsData.data].sort((a, b) => a.name.localeCompare(b.name));
  //       case "z-a":
  //         return [...teamsData.data].sort((a, b) => b.name.localeCompare(a.name));
  //       default:
  //         return teamsData.data;
  //     }
  //   };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl">Team Management</h2>
          <p className="text-sm text-muted-foreground">
            Organize members into teams and manage roles
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-rateup-blue to-rateup-blue hover:shadow-lg transition-all"
          onClick={() => setIsCreateTeamDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>
      {/* show teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {teamsData?.data?.map((team) => (
          <Card
            key={team.id}
            className="p-5 shadow-sm border-gray-200 hover:shadow-md hover:border-rateup-blue/30 transition-all"
          >
            <div className="flex justify-between flex-col gap-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center`}
                  style={{
                    backgroundColor:
                      team.color === "null" ? "blue" : team.color,
                  }}
                >
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-start gap-1">
                    <h4 className="mb-1">{team.name}</h4>
                    <p className="text-xs text-muted-foreground border border-gray-300 rounded-xl px-2 py-0.5">
                      {team.code}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created:{" "}
                    {team?.createdAt
                      ? dayjs(team.createdAt).format("DD MMM YYYY")
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {Array.from({
                      length: Math.min(team._count.members, 3),
                    }).map((_, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-rateup-blue to-rateup-orange flex items-center justify-center text-white text-xs font-medium"
                      >
                        <User className="h-4 w-4" />
                      </div>
                    ))}

                    {team._count.members > 3 && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                        <span className="text-xs text-gray-600">
                          +{team._count.members - 3}
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="text-sm text-muted-foreground ml-2">
                    {team._count.members}{" "}
                    {team._count.members === 1 ? "member" : "members"}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTeam(team);
                    setEditedColor(team.color || "blue");
                    setIsManageTeamDialogOpen(true);
                  }}
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* create team */}
      <Dialog
        open={isCreateTeamDialogOpen}
        onOpenChange={setIsCreateTeamDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Organize your team members into groups for better collaboration
              and management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="e.g., Customer Support Team"
                className="h-10 border-2 border-gray-200 focus:border-rateup-blue"
                {...createTeamForm.getInputProps("name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Code</Label>
              <Input
                id="team-code"
                placeholder="e.g., Team123"
                className="h-10 border-2 border-gray-200 focus:border-rateup-blue"
                {...createTeamForm.getInputProps("code")}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Color</Label>
              <div className="flex gap-3">
                {colorArray.map((color, index) => {
                  const isSelected = createTeamForm.values.color === color.from;
                  return (
                    <button
                      key={index}
                      type="button"
                      className={`w-12 h-12 rounded-lg border-2 ${isSelected ? "border-black" : "border-transparent"} transition-all`}
                      style={{
                        background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                      }}
                      onClick={() =>
                        createTeamForm.setFieldValue("color", color.from)
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isCreating}
              className="bg-gradient-to-r from-rateup-blue to-rateup-blue"
              onClick={() => {
                const values = createTeamForm.values;

                // Validate first
                const validation = createTeamForm.validate();
                if (validation.hasErrors) return; // stop if validation fails

                handleSubmit(values);
              }}
            >
              {isCreating ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* manage teams */}
      <Dialog
        open={isManageTeamDialogOpen}
        onOpenChange={setIsManageTeamDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all`}
                style={{
                  backgroundColor: editedColor,
                }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle>{selectedTeam?.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Created {selectedTeam?.createdAt}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="members">
                Members ({selectedTeam?._count?.members || 0})
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-team-name">Team Name</Label>
                <Input
                  id="edit-team-name"
                  defaultValue={selectedTeam?.name}
                  className="border-2 border-gray-200 focus:border-rateup-blue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-team-code">Team Code</Label>
                <Input
                  id="edit-team-code"
                  defaultValue={selectedTeam?.code}
                  className="border-2 border-gray-200 focus:border-rateup-blue"
                />
              </div>

              <div className="space-y-2">
                <Label>Team Color</Label>
                <div className="flex gap-3">
                  {colorArray.map((color, index) => {
                    const isSelected = editedColor === color.from;
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`w-12 h-12 rounded-lg border-2 ${isSelected ? "border-black" : "border-transparent"} transition-all`}
                        style={{
                          background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                        }}
                        onClick={() => setEditedColor(color.from)}
                      />
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* <TabsContent value="members" className="space-y-3">
            
              <div className="flex items-center justify-between pb-2 border-b">
                <p className="text-sm text-muted-foreground">
                  {selectedTeam?.members?.length || 0} member
                  {(selectedTeam?.members?.length || 0) !== 1 ? "s" : ""} in
                  this team
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-rateup-blue to-rateup-orange"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Member
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm mb-1">Add Members to Team</h4>
                        <p className="text-xs text-muted-foreground">
                          Select users to add to {selectedTeam?.name}
                        </p>
                      </div>
                      <Separator />
                      <ScrollArea className="h-[240px]">
                        <div className="space-y-1">
                          {users
                            .filter(
                              (u) =>
                                u.status === "active" &&
                                !selectedTeam?.members?.includes(u.id),
                            )
                            .map((user) => (
                              <button
                                key={user.id}
                                className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                onClick={() => {
                                  if (selectedTeam) {
                                    setTeams(
                                      teams.map((t) =>
                                        t.id === selectedTeam.id
                                          ? {
                                              ...t,
                                              members: [...t.members, user.id],
                                            }
                                          : t,
                                      ),
                                    );
                                    setSelectedTeam({
                                      ...selectedTeam,
                                      members: [
                                        ...selectedTeam.members,
                                        user.id,
                                      ],
                                    });
                                    toast.success(`${user.name} added to team`);
                                  }
                                }}
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-xs">
                                    {user.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-xs capitalize flex-shrink-0"
                                >
                                  {user.role}
                                </Badge>
                              </button>
                            ))}
                          {users.filter(
                            (u) =>
                              u.status === "active" &&
                              !selectedTeam?.members?.includes(u.id),
                          ).length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                All active users are already in this team
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

             
              <ScrollArea className="h-[260px] pr-3">
                <div className="space-y-2">
                  {selectedTeam?.members?.map((memberId: string) => {
                    const member = users.find((u) => u.id === memberId);
                    if (!member) return null;

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-rateup-blue to-rateup-orange text-white text-xs">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {member.role}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (selectedTeam) {
                                setTeams(
                                  teams.map((t) =>
                                    t.id === selectedTeam.id
                                      ? {
                                          ...t,
                                          members: t.members.filter(
                                            (id) => id !== memberId,
                                          ),
                                        }
                                      : t,
                                  ),
                                );
                                setSelectedTeam({
                                  ...selectedTeam,
                                  members: selectedTeam.members.filter(
                                    (id) => id !== memberId,
                                  ),
                                });
                                toast.success(
                                  `${member.name} removed from team`,
                                );
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedTeam?.members ||
                    selectedTeam.members.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm mb-1">
                        No members in this team yet
                      </p>
                      <p className="text-xs">
                        Click "Add Member" to get started
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm text-red-700 mb-1">Delete Team</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Permanently delete this team. Team members will remain in
                      your organization.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to delete "${selectedTeam?.name}"? This action cannot be undone.`,
                          )
                        ) {
                          setTeams(
                            teams.filter((t) => t.id !== selectedTeam?.id),
                          );
                          setIsManageTeamDialogOpen(false);
                        }
                      }}
                    >
                      Delete Team
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent> */}
          </Tabs>

          {/* <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManageTeamDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-rateup-blue to-rateup-orange"
              onClick={() => {
               
                setTeams(
                  teams.map((t) =>
                    t.id === selectedTeam?.id
                      ? {
                          ...t,
                          color: editedTeamColor,
                          name:
                            (
                              document.getElementById(
                                "edit-team-name",
                              ) as HTMLInputElement
                            )?.value || t.name,
                          description:
                            (
                              document.getElementById(
                                "edit-team-description",
                              ) as HTMLTextAreaElement
                            )?.value || t.description,
                        }
                      : t,
                  ),
                );
                setIsManageTeamDialogOpen(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter> */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;

function newnew() {
  return <div></div>;
}
