import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronRight, Plus, RefreshCcw, User, Users } from "lucide-react";
import { useId, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { useSubscription } from "@/backend/subscription/subscription.query";
import { useCreateTeamMutation, useTeamsByUser } from "@/backend/team/team.query";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { colorArray } from "@/components/settings/team.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { SubscriptionFeaturePathName as sfpn, TeamFeature } from "@/types/enums.ts";
import { formatDate } from "@/utils/dateTime.ts";
import { UserRole } from "@/utils/enums/index.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

export const Route = createFileRoute("/dashboard/settings/team/")({
  component: Team,
});

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

function Team() {
  const uid = useId();
  const { t: translations } = useTranslation();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const action = searchParams?.action;
  const { user } = useUser();
  const { data: subscription } = useSubscription();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<TeamFeature>>(new Set());
  // Only show features that are active in this org's subscription
  const availableFeatures = FEATURES_WITH_SUBSCRIPTION.filter(({ requiredSubscriptions }) => {
    if (!requiredSubscriptions || requiredSubscriptions.length === 0) return true;
    return requiredSubscriptions.every((sfp) => hasFeature(subscription, sfp));
  });

  const toggleFeature = (feature: TeamFeature) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return next;
    });
  };

  const allEnabled = selectedFeatures.size === availableFeatures.length;
  const toggleAll = () => {
    if (allEnabled) {
      setSelectedFeatures(new Set());
    } else {
      setSelectedFeatures(new Set(availableFeatures.map((f) => f.feature)));
    }
  };

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsData,
    refetch: refetchTeams,
  } = useTeamsByUser() as {
    isLoading: boolean;
    error;
    data: TeamsResponse;
    refetch;
  };
  const getDefaultColor = () => {
    if (!teamsData?.data) {
      // fallback random color
      return colorArray[Math.floor(Math.random() * colorArray.length)].from;
    }
    const index = teamsData.data.length;
    return colorArray[index % colorArray.length].from;
  };
  const createTeamSchema = z.object({
    name: z.string().min(3, translations("Team Name should be at least 3 characters long")),
    code: z.string().superRefine((value, ctx) => {
      if (value.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: translations("Team Code should be at least 2 characters long"),
        });
        return;
      }

      if (/\s/.test(value)) {
        const suggested = value.trim().replace(/\s+/g, "-");
        ctx.addIssue({
          code: "custom",
          message: `${translations("Spaces are not allowed, try")} "${suggested}"`,
        });
        return;
      }

      if (!/^[A-Za-z0-9-]+$/.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: translations("Team Code can contain only alphabets, numbers, and hyphens"),
        });
      }
    }),
    color: z.string(),
  });

  type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

  const createTeamForm = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      code: "",
      color: "",
    },
  });

  const colorValue = createTeamForm.watch("color");

  const createTeamMutation = useCreateTeamMutation(
    setIsCreateTeamDialogOpen,
    createTeamForm,
    setIsCreating,
  );

  const handleSubmit = async (values: CreateTeamFormValues) => {
    setIsCreating(true);
    toast.loading(
      `${translations("Hold on, Your team")} '${values?.name}' ${translations("is getting created.")}`,
      {
        id: "load-data",
      },
    );
    createTeamMutation.mutate({
      ...values,
      features: Array.from(selectedFeatures),
    });
  };
  useEffect(() => {
    if (action === "create") {
      setIsCreateTeamDialogOpen(true);
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
            onClick={() => {
              createTeamForm.reset({
                name: "",
                code: "",
                color: getDefaultColor(),
              });

              setIsCreateTeamDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {translations("Create Team")}
          </Button>
        )}
      </div>
      {/* Teams Grid with Skeletons */}
      <CardGrid
        items={teamsData?.data ?? []}
        getKey={(team) => team.id}
        renderItem={(team) => (
          <ActionCard
            onClick={() => {
              if (user?.role === UserRole.SUPADM) {
                navigate({
                  to: `/dashboard/settings/team/${team.id}`,
                });
              }
            }}
            title={
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: team.color || "#7F77DD" }}
                >
                  <Users className="w-[17px] h-[17px] text-white" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">{team.name}</span>
                    <span className="text-[11px] font-medium border rounded-full px-1.5 py-0.5 text-muted-foreground bg-muted">
                      {team.code}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">
                    {translations("created")} {formatDate(team.createdAt)}
                  </span>
                </div>
              </div>
            }
            footerLeft={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="flex">
                    {Array.from({
                      length: Math.min(team._count.members, 3),
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[26px] h-[26px] rounded-full border-2 border-background flex items-center justify-center -ml-1.5 first:ml-0"
                        style={{ backgroundColor: team.color || "#7F77DD" }}
                      >
                        <User className="h-3 w-3 text-white" />
                      </div>
                    ))}
                    {team._count.members > 3 && (
                      <div className="w-[26px] h-[26px] rounded-full bg-muted border-2 border-background flex items-center justify-center -ml-1.5">
                        <span className="text-[9px] font-medium text-muted-foreground">
                          +{team._count.members - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {team._count.members}{" "}
                    {team._count.members === 1 ? translations("member") : translations("members")}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            }
          />
        )}
      />
      {/* create team */}
      {user?.role === UserRole.SUPADM && (
        <Dialog
          open={isCreateTeamDialogOpen}
          onOpenChange={(open) => {
            setIsCreateTeamDialogOpen(open);
            if (!open) {
              setSelectedFeatures(new Set());
            }
          }}
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
            <form onSubmit={createTeamForm.handleSubmit(handleSubmit)}>
              <div className="flex flex-col gap-4 py-4">
                <Controller
                  name="name"
                  control={createTeamForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{translations("Team Name")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g., Customer Support Team"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="code"
                  control={createTeamForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{translations("Team Code")}</FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="e.g., TEAM"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <FieldTitle>{translations("Team Color")}</FieldTitle>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {colorArray.map((color, index) => {
                      const isSelected = colorValue === color.from;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`w-full aspect-square rounded-lg border-2 ${
                            isSelected ? "border-black scale-105" : "border-transparent"
                          } transition-all hover:scale-105`}
                          style={{
                            background: `linear-gradient(to bottom right, ${color.from}, ${color.to})`,
                          }}
                          onClick={() => createTeamForm.setValue("color", color.from)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Feature Access */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <FieldTitle>{translations("Feature Access")}</FieldTitle>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs text-primary hover:underline"
                    >
                      {allEnabled ? translations("Disable All") : translations("Enable All")}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableFeatures.map(({ feature, label }) => (
                      <Field
                        key={feature}
                        orientation="horizontal"
                        className="justify-between rounded-md border px-3 py-1.5"
                      >
                        <FieldLabel
                          htmlFor={`${uid}-feature-${feature}`}
                          className="text-sm font-normal text-muted-foreground"
                        >
                          {label}
                        </FieldLabel>
                        <Switch
                          id={`${uid}-feature-${feature}`}
                          checked={selectedFeatures.has(feature)}
                          onCheckedChange={() => toggleFeature(feature)}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating} className="bg-primary">
                  {isCreating ? translations("Creating") : translations("Create Team")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
