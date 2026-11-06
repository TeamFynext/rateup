import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useId, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import type { CreateSurveyResponse } from "@/backend/surveys/survey.api";
import { surveyKeys } from "@/backend/surveys/survey.keys";
import { useCreateSurveyMutation } from "@/backend/surveys/surveys.query";
import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

const Languages = ["English", "മലയാളം", "Deutsch", "हिन्दी", "ಕನ್ನಡ", "Français", "عربي", "தமிழ்"];
const defaultLanguage = "English";
const languageOptions = Languages.map((lang) => ({ label: lang, value: lang }));

interface CreateSurveyModalProps {
  open: boolean;
  close: () => void;
  surveyType: "web" | "whatsapp";
  teamsData: TeamData[] | undefined;
  template?: Survey | null;
  setTemplate?: (template: Survey | null) => void;
}

interface CreateSurveyFormValues {
  title: string;
  languages: string[];
  teamIds: string[];
  getLocation: boolean;
  selectedTheme: string;
}

export function CreateSurveyModal({
  open,
  close,
  surveyType,
  teamsData,
  template,
  setTemplate,
}: CreateSurveyModalProps) {
  const uid = useId();
  const [teamChoice, setTeamChoice] = useState("all");
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const [prevOpen, setPrevOpen] = useState(false);
  const searchParams = useSearch({ strict: false });
  // A template can be pre-selected through the URL (`?tmp=<id>&tn=<title>`).
  const tmp = typeof searchParams.tmp === "string" ? searchParams.tmp : undefined;
  const tn = typeof searchParams.tn === "string" ? searchParams.tn : undefined;

  const [templateId, setTemplateId] = useState<string | null>(template?.id || tmp || null);
  const [templateName, setTemplateName] = useState<string | null>(template?.title || tn || null);

  const { data: allThemesArr, isPending: isAllThemesFetchPending } = useAllThemes();
  const selectThemeDropdownData =
    allThemesArr?.map(({ id, name }: { id: string; name: string }) => ({
      value: id,
      label: name,
    })) ?? [];

  const allTeams = teamsData?.map((team: { id: string; name: string }) => team?.id) ?? [];
  const teamOptions =
    teamsData?.map((team: { id: string; name: string }) => ({
      value: team?.id,
      label: team?.name,
    })) ?? [];

  const formSchema = z.object({
    title: z.string().min(1, translations("Cannot be empty")),
    languages: z.array(z.string()).min(1, translations("Must contain at least one language")),
    teamIds: z.array(z.string()).min(1, translations("Must contain atleast one team")),
    getLocation: z.boolean(),
    selectedTheme: z.string(),
  });

  const { control, handleSubmit, setValue, watch, reset } = useForm<CreateSurveyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: templateName ? templateName : "",
      languages: [defaultLanguage],
      teamIds: [],
      getLocation: false,
      selectedTheme: "",
    },
  });

  const watchedTeamIds = watch("teamIds");
  const watchedSelectedTheme = watch("selectedTheme");

  useEffect(() => {
    if (template) {
      setTemplateId(template?.id);
      setTemplateName(template?.title);
    }
  }, [template]);

  useEffect(() => {
    setValue("title", templateName ?? "");
  }, [templateName]);

  useEffect(() => {
    if (prevOpen === true && open === false && setTemplate) {
      setTemplate(null);
      setTemplateName(null);
      setTemplateId(null);
    }
    setPrevOpen(open);
  }, [open]);

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

  useEffect(() => {
    setValue("teamIds", []);
  }, [teamChoice]);

  useEffect(() => {
    if (teamChoice === "all" && !arraysEqual(watchedTeamIds, allTeams)) {
      setValue("teamIds", allTeams);
    }
  }, [allTeams, teamChoice, watchedTeamIds]);

  const resetForm = () => {
    reset();
    setValue("languages", [defaultLanguage]);
  };

  useEffect(() => {
    reset();
    setValue("languages", [defaultLanguage]);
  }, [open]);

  useEffect(() => {
    if (!watchedSelectedTheme) {
      const defaultThemeId = allThemesArr?.find(
        (themeObj: { id: string; name: string }) => themeObj.name === "Default Theme",
      )?.id;
      setValue("selectedTheme", defaultThemeId || "");
    }
  }, [allThemesArr, open, watchedSelectedTheme]);

  function handleClose() {
    close();
    resetForm();
  }

  const [isLoading, setIsLoading] = useState(false);
  const createSurveyMutation = useCreateSurveyMutation();
  const queryClient = useQueryClient();

  const onSubmit = (values: CreateSurveyFormValues) => {
    toast.loading(translations("Hold on, your survey is getting created..."), {
      id: "load-data",
    });
    createSurveyMutation.mutate(
      { ...values, type: surveyType, templateId: templateId || "" },
      {
        onSuccess: (data: CreateSurveyResponse) => {
          queryClient.invalidateQueries({ queryKey: surveyKeys.whatsapp() });
          queryClient.invalidateQueries({ queryKey: surveyKeys.all() });
          if (data?.id) {
            setIsLoading(true);
            navigate({
              to: `/dashboard/surveys/${data?.id}`,
            });
          }
        },
        onError: (_error) => {
          toast.dismiss("load-data");
        },
      },
    );
  };
  return isLoading ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center rounded-sm bg-background/50 backdrop-blur-[2px]">
      <Spinner className="size-8 text-primary" />
    </div>
  ) : (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-[1.2rem] font-medium">
            {translations("Create Survey")}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
            if (isSave) {
              e.preventDefault();
              handleSubmit(onSubmit)();
            }
          }}
        >
          <Field style={{ minHeight: "300px" }}>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {templateName === null
                      ? translations("Title")
                      : translations("Template Selected")}
                    {""}
                    <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder={templateName === null ? translations("Enter title") : templateName}
                    disabled={templateName !== null}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {/* // TODO: Add a user-level language list */}

            {templateName === null && (
              <Controller
                name="languages"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${uid}-field`}>
                      {translations("Select Languages")} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <MultiSelect
                      id={`${uid}-field`}
                      options={languageOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={translations("Select languages")}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            <FieldSet>
              <FieldLegend variant="label">
                {translations("Select teams")} <span className="text-destructive">*</span>
              </FieldLegend>
              <RadioGroup
                value={teamChoice}
                onValueChange={setTeamChoice}
                className="flex flex-row gap-4"
              >
                <FieldLabel
                  htmlFor="team-choice-all"
                  className="flex-row items-center gap-2 font-normal"
                >
                  <RadioGroupItem id="team-choice-all" value="all" />
                  {translations("All Teams")}
                </FieldLabel>
                <FieldLabel
                  htmlFor="team-choice-manual"
                  className="flex-row items-center gap-2 font-normal"
                >
                  <RadioGroupItem id="team-choice-manual" value="manual" />
                  {translations("Select Manually")}
                </FieldLabel>
              </RadioGroup>
            </FieldSet>

            {teamChoice === "manual" && (
              <Controller
                name="teamIds"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <MultiSelect
                      options={teamOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={translations("Select teams (type in to search)")}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            {!template && (
              <Controller
                name="selectedTheme"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-field-3`}>
                      {translations("Select Theme")}
                    </FieldLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        items={selectThemeDropdownData}
                      >
                        <SelectTrigger id={`${uid}-field-3`} className="w-full">
                          <SelectValue placeholder={translations("Select Theme")} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectThemeDropdownData.map(
                            (themeOpt: { value: string; label: string }) => (
                              <SelectItem key={themeOpt.value} value={themeOpt.value}>
                                {themeOpt.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      {isAllThemesFetchPending && <Spinner className="size-4 shrink-0" />}
                    </div>
                  </Field>
                )}
              />
            )}
          </Field>
          <div className="mt-6 flex justify-center">
            <Button type="submit">{translations("Submit")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
