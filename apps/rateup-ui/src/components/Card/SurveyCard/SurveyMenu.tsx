import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCopy,
  IconDots,
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useId, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import { deleteSurvey, deleteSurveyForOneTeam, updateSurvey } from "@/backend/surveys/survey.api";
import { useCloneSurveyMutation } from "@/backend/surveys/surveys.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useDisclosure } from "@/hooks/useDisclosure";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

interface SurveyMenuProps {
  survey: Survey;
  selectedTeamId: string;
  teamsData: any;
  refetchSurveys: any;
}

export function SurveyMenu({ survey, selectedTeamId, teamsData, refetchSurveys }: SurveyMenuProps) {
  const uid = useId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const { t: translations } = useTranslation();
  const [opened, { close, open }] = useDisclosure(false);
  const confirm = useConfirm();
  const [teamChoice, setTeamChoice] = useState("all");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const allTeams = teamsData?.map((team: { id: string; name: string }) => team?.id);
  const teamOptions = teamsData?.map((team: { id: string; name: string }) => ({
    value: team?.id,
    label: team?.name,
  }));

  const cloneForm = useForm<{ teamIds: string[] }>({
    resolver: zodResolver(
      z.object({
        teamIds: z.array(z.string()).min(1, translations("Must contain atleast one team")),
      }),
    ),
    defaultValues: {
      teamIds: [],
    },
  });
  const cloneTeamIds = cloneForm.watch("teamIds");

  useEffect(() => {
    cloneForm.setValue("teamIds", selectedTeams, { shouldDirty: true, shouldValidate: true });
  }, [selectedTeams, cloneForm]);

  useEffect(() => {
    setSelectedTeams([]);
  }, [teamChoice]);

  useEffect(() => {
    if (teamChoice === "all" && !arraysEqual(cloneTeamIds, allTeams)) {
      cloneForm.setValue("teamIds", allTeams, { shouldDirty: true, shouldValidate: true });
    }
  }, [allTeams, teamChoice, cloneTeamIds, cloneForm]);

  const onSubmit = (values: { teamIds: string[] }) => {
    toast.loading(translations("Hold on, your survey is getting clonned..."), {
      id: "load-data",
    });
    cloneSurvey.mutate({ id: survey?.id, teamIds: values.teamIds });
  };

  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamId,
  });

  const surveyDeleteMutation = useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId?: string }) =>
      selectedTeamId && selectedTeamId !== "all"
        ? deleteSurveyForOneTeam(id, teamId ?? "")
        : deleteSurvey(id),
    onSuccess: () => {
      toast.success(translations("Deleted Survey Successfully!"), {
        id: "delete-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error) => {
      // console.error("Error deleting Survey:", error.message);
      toast.error(error?.message, {
        id: "delete-data",
      });
    },
  });

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      toast.success(translations("Survey status Updated!"), {
        id: "survey",
      });
      refetchSurveys();
    },
  });

  async function handleDeleteSurvey() {
    const shouldDelete = await confirm({
      title: translations("Delete Survey?"),
      description: translations("Are you sure to delete this Survey?"),
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    toast.loading(translations("Hold on, survey is getting deleted..."), {
      id: "delete-data",
    });
    if (selectedTeamId && selectedTeamId !== "all") {
      await surveyDeleteMutation.mutateAsync({
        id: survey?.id,
        teamId: selectedTeamId,
      });
    } else {
      await surveyDeleteMutation.mutateAsync({ id: survey?.id });
    }
    refetchSurveys();
  }

  const closeCloneModal = () => {
    close();
    cloneForm.reset();
  };
  const submitClone = cloneForm.handleSubmit(onSubmit);

  return (
    <DropdownMenu>
      <Dialog
        open={opened}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeCloneModal();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-auto sm:max-w-125"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-3xl font-semibold">
              {translations("Clone Survey")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="p-5"
            onSubmit={submitClone}
            onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => void submitClone()]])}
          >
            <Field>
              <p className="text-sm text-muted-foreground">
                {translations("Select the team/teams in which the survey copy to be created.")}
              </p>
              <div className="flex flex-col gap-2">
                <FieldSet>
                  <FieldLegend id={`${uid}-teams-legend`}>
                    {translations("Select teams")}
                    <span className="text-destructive">*</span>
                  </FieldLegend>
                  <RadioGroup
                    value={teamChoice}
                    onValueChange={(value) => setTeamChoice(value as string)}
                    name="selectTeams"
                    aria-labelledby={`${uid}-teams-legend`}
                    className="mt-2 flex flex-row items-center gap-4"
                  >
                    <FieldLabel htmlFor={`${uid}-teams-all`} className="items-center font-normal">
                      <RadioGroupItem id={`${uid}-teams-all`} value="all" />
                      {translations("All teams")}
                    </FieldLabel>
                    <FieldLabel
                      htmlFor={`${uid}-teams-manual`}
                      className="items-center font-normal"
                    >
                      <RadioGroupItem id={`${uid}-teams-manual`} value="manual" />
                      {translations("Select Manually")}
                    </FieldLabel>
                  </RadioGroup>
                </FieldSet>

                {teamChoice === "manual" && (
                  <Field>
                    <MultiSelect
                      id={`${uid}-field-3`}
                      value={selectedTeams}
                      onValueChange={setSelectedTeams}
                      placeholder={translations("Select teams (type in to search)")}
                      options={teamOptions}
                      className="w-full"
                    />
                    {cloneForm.formState.errors.teamIds && (
                      <FieldError>{cloneForm.formState.errors.teamIds.message}</FieldError>
                    )}
                  </Field>
                )}
              </div>
            </Field>
            <DialogFooter className="mt-4">
              <Button type="reset" variant="ghost" onClick={closeCloneModal}>
                {translations("Cancel")}
              </Button>
              <Button type="submit">{translations("Submit")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-50"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DropdownMenuItem onClick={() => surveyUpdateMutation.mutate({ active: !survey?.active })}>
          {survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />}
          {survey?.active ? translations("Pause Survey") : translations("Resume Survey")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: `${pathname}/${survey?.id}?tab=Share`,
            });
          }}
        >
          <IconShare />
          {translations("Share")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            open();
          }}
        >
          <IconCopy />
          {translations("Clone")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeleteSurvey}>
          <IconTrash />
          {translations("Delete")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: `${pathname}/${survey?.id}?tab=Settings`,
            });
          }}
        >
          <IconSettings />
          {translations("Settings")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function arraysEqual(a: string[], b: string[]) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a?.length !== b?.length) return false;

  a.sort();
  b.sort();

  for (let i = 0; i < a?.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
