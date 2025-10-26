import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { Plus, Users } from "lucide-react";
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
                        U{index + 1}
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
                  //   onClick={() => {
                  //     setSelectedTeam(team);
                  //     setEditedTeamColor(team.color || "blue");
                  //     setIsManageTeamDialogOpen(true);
                  //   }}
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
    </div>
  );
};

export default Team;
