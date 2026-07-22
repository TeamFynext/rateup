import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import type { CreateSurveyResponse } from "@/backend/surveys/survey.api";
import { useCreateSurveyMutation } from "@/backend/surveys/surveys.query";
import { useAllThemes } from "@/backend/surveyTheme/surveyTheme.query";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
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
  teamsData: any;
  template?: any;
  setTemplate?: any;
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
  const [teamChoice, setTeamChoice] = useState("all");
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const [prevOpen, setPrevOpen] = useState(false);
  const searchParams = useSearch({ strict: false });
  const tmp = searchParams.tmp;
  const tn = searchParams.tn;

  const [templateId, setTemplateId] = useState(template?.id || tmp || null);
  const [templateName, setTemplateName] = useState(template?.title || tn || null);

  const { data: allThemesArr, isPending: isAllThemesFetchPending } = useAllThemes();
  const selectThemeDropdownData =
    allThemesArr?.map(({ id, name }) => ({ value: id, label: name })) ?? [];

  const allTeams = teamsData?.map((team) => team?.id) ?? [];
  const teamOptions = teamsData?.map((team) => ({ value: team?.id, label: team?.name })) ?? [];

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
    setValue("title", templateName);
  }, [templateName]);

  useEffect(() => {
    if (prevOpen === true && open === false && setTemplate) {
      setTemplate(null);
      setTemplateName(null);
      setTemplateId(null);
    }
    setPrevOpen(open);
  }, [open]);

  function arraysEqual(a, b) {
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
        (themeObj) => themeObj.name === "Default Theme",
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
          queryClient.invalidateQueries({ queryKey: ["whatsappsurveys"] });
          queryClient.invalidateQueries({ queryKey: ["surveys"] });
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
      <Spinner className="size-8" style={{ color: "var(--tertiary-color)" }} />
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
          <div className="flex flex-col gap-4" style={{ minHeight: "300px" }}>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {templateName === null
                      ? translations("Title")
                      : translations("Template Selected")}{" "}
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
                    <FieldLabel>
                      {translations("Select Languages")} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <MultiSelect
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

            <Field>
              <FieldLabel>
                {translations("Select teams")} <span className="text-destructive">*</span>
              </FieldLabel>
              <RadioGroup
                value={teamChoice}
                onValueChange={setTeamChoice}
                className="flex flex-row gap-4"
              >
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="all" />
                  {translations("All Teams")}
                </label>
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="manual" />
                  {translations("Select Manually")}
                </label>
              </RadioGroup>
            </Field>

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
                    <FieldLabel>{translations("Select Theme")}</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        items={selectThemeDropdownData}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={translations("Select Theme")} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectThemeDropdownData.map((themeOpt) => (
                            <SelectItem key={themeOpt.value} value={themeOpt.value}>
                              {themeOpt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isAllThemesFetchPending && <Spinner className="size-4 shrink-0" />}
                    </div>
                  </Field>
                )}
              />
            )}
          </div>
          <div className="mt-6 flex justify-center">
            <Button type="submit">{translations("Submit")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
