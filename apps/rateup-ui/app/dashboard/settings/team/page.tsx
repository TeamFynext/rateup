"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import { Plus, RefreshCcw, User, Users, UserX } from "lucide-react";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  useCreateTeamMutation,
  useTeamsByUser,
} from "@/backend/team/team.query";
import { colorArray } from "@/components/settings/team";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/context/UserContext";
import { UserRole } from "@/utils/enums";

const Team = () => {
  const translations = useExtracted();
  const router = useRouter();
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
              {translations("Spaces are not allowed, try")}"{suggested}"
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

  const createTeamMutation = useCreateTeamMutation(
    setIsCreateTeamDialogOpen,
    createTeamForm,
    setIsCreating,
  );

  const handleSubmit = async (values) => {
    setIsCreating(true);
    toast.loading(
      `${translations("Hold on, Your team")} '${values?.name}' ${translations("is getting created.")}`,
      {
        id: "load-data",
      },
    );
    createTeamMutation.mutate(values);
  };
  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-2xl">{translations("Team Management")}</h2>
            <Button
              disabled={isLoadingTeamsUser}
              variant="outline"
              onClick={refetchTeams}
              className="flex items-center justify-center gap-1"
            >
              <RefreshCcw />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {translations("Organize members into teams and manage roles")}
          </p>
        </div>

        {user?.role === UserRole.SUPADM && (
          <Button
            className="bg-primary hover:shadow-lg transition-all"
            onClick={() => setIsCreateTeamDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
            {translations("Create Team")}
          </Button>
        )}
      </div>
      {/* Teams Grid with Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {isLoadingTeamsUser ? (
          // Show 4 skeleton cards while loading
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-5 shadow-sm border-gray-200">
              <div className="flex justify-between flex-col gap-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-16 rounded-xl" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="w-8 h-8 rounded-full" />
                      ))}
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              </div>
            </Card>
          ))
        ) : // Show actual teams
        teamsData?.data?.length > 0 ? (
          teamsData?.data?.map((team) => (
            <Card
              key={team.id}
              className="p-5 shadow-sm border-gray-200 hover:shadow-md hover:border-rateup-blue/30 transition-all"
              onClick={() => {
                user?.role === UserRole.SUPADM &&
                  router.push(`/dashboard/settings/team/${team.id}`);
              }}
            >
              <div className="flex justify-between flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center`}
                    style={{
                      backgroundColor: team.color ? team.color : "blue",
                    }}
                  >
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-start gap-1">
                      <h4>{team.name}</h4>
                      <p className="text-xs text-muted-foreground border border-gray-300 rounded-xl px-2 py-0.5">
                        {team.code}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {translations("Created")}:{" "}
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
                          className="w-8 h-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-white text-xs font-medium"
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

                    <span className="text-sm text-muted-foreground">
                      {team._count.members}{" "}
                      {team._count.members === 1
                        ? translations("member")
                        : translations("members")}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-10 flex gap-1 min-w-full text-gray-300">
            <UserX />
            <h2>{translations("You are not in any team")}</h2>
          </div>
        )}
      </div>
      {/* create team */}
      {user?.role === UserRole.SUPADM && (
        <Dialog
          open={isCreateTeamDialogOpen}
          onOpenChange={setIsCreateTeamDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                {translations(
                  "Organize your team members into groups for better collaboration and management",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">{translations("Team Name")}</Label>
                <Input
                  id="team-name"
                  placeholder="e.g., Customer Support Team"
                  className="h-10 border-2 border-gray-200 focus:border-rateup-blue"
                  {...createTeamForm.getInputProps("name")}
                />
                {createTeamForm.errors.name && (
                  <p className="text-xs text-red-500">
                    {createTeamForm.errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-name">{translations("Team Code")}</Label>
                <Input
                  id="team-code"
                  placeholder="e.g., TEAM"
                  className="h-10 border-2 border-gray-200 focus:border-rateup-blue"
                  {...createTeamForm.getInputProps("code")}
                />
                {createTeamForm.errors.code && (
                  <p className="text-xs text-red-500">
                    {createTeamForm.errors.code}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>{translations("Team Color")}</Label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {colorArray.map((color, index) => {
                    const isSelected =
                      createTeamForm.values.color === color.from;
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`w-full aspect-square rounded-lg border-2 ${
                          isSelected
                            ? "border-black scale-105"
                            : "border-transparent"
                        } transition-all hover:scale-105`}
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
                className="bg-primary"
                onClick={() => {
                  const values = createTeamForm.values;

                  // Validate first
                  const validation = createTeamForm.validate();
                  if (validation.hasErrors) return; // stop if validation fails

                  handleSubmit(values);
                }}
              >
                {isCreating
                  ? translations("Creating")
                  : translations("Create Team")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Team;
