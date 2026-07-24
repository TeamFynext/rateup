import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useId, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox.tsx";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { docsPath } from "@/utils/constants.ts";

import InfoButton from "../../../Button/InfoButton.tsx";

const DEFAULT_LANGUAGES = ["English", "Malayalam", "Hindi", "Kannada", "Tamil"];

type FormValues = {
  title: string;
  languages: string[];
  teams: string[];
  sendWeeklyReport: boolean;
};

const GeneralSettings = ({ survey, enabledModules, setSelectedLanguage }) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const { data: teamRes } = useTeamsByUser();
  const editSurvey = useEditSurveyMutation(survey?.id);

  const teamOptions =
    teamRes?.data?.map((team) => ({
      value: team?.id,
      label: team?.name,
    })) ?? [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      title: survey?.title || "",
      languages: survey?.langauges || [],
      teams: survey?.teams?.map((team) => team?.id) || [],
      sendWeeklyReport: survey?.sendWeeklyReport ?? true,
    },
  });

  useEffect(() => {
    if (survey) {
      reset({
        title: survey.title || "",
        languages: survey.languages || [],
        teams: survey.teams?.map((t: any) => t?.id) || [],
        sendWeeklyReport: survey.sendWeeklyReport ?? true,
      });
    }
  }, [survey]);

  const selectedTeams = watch("teams");

  const onSubmit = (values: FormValues) => {
    editSurvey.mutate(values, {
      onSettled: () => {
        if (setSelectedLanguage && values.languages?.[0]) {
          setSelectedLanguage(values.languages[0]);
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2.25 pb-2">
        <IconAdjustmentsHorizontal className="size-4 text-primary" />
        <CardTitle className="font-nunito text-[15px] font-extrabold">
          {translations("General")}
        </CardTitle>
        <InfoButton docUrl={`${docsPath}/webSurvey/shareSurvey`} />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              handleSubmit(onSubmit)(e as any);
            }
          }}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            {enabledModules.includes("name") && (
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor={`${uid}-field`}>
                  {translations("Survey Name")} <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id={`${uid}-field`}
                  placeholder={translations("Enter Survey name")}
                  {...register("title", {
                    required: translations("Cannot be Empty"),
                  })}
                />
                {errors.title && (
                  <FieldDescription className="text-destructive">
                    {errors.title.message}
                  </FieldDescription>
                )}
              </Field>
            )}

            {enabledModules.includes("language") && (
              <Field data-invalid={!!errors.languages}>
                <FieldTitle>
                  {translations("Survey Languages")} <span className="text-destructive">*</span>
                </FieldTitle>
                <Controller
                  control={control}
                  name="languages"
                  rules={{
                    validate: (v) =>
                      v.length > 0 || translations("Must contain atleast one language"),
                  }}
                  render={({ field }) => (
                    <MultiSelectCreatable value={field.value} onValueChange={field.onChange} />
                  )}
                />
                {errors.languages && (
                  <FieldDescription className="text-destructive">
                    {errors.languages.message as string}
                  </FieldDescription>
                )}
              </Field>
            )}

            {enabledModules.includes("teams") && (
              <Field data-invalid={!!errors.teams}>
                <FieldLabel htmlFor={`${uid}-field-2`}>
                  {translations("Select Teams")} <span className="text-destructive">*</span>
                </FieldLabel>
                <MultiSelect
                  id={`${uid}-field-2`}
                  options={teamOptions}
                  value={selectedTeams}
                  onValueChange={(v) =>
                    setValue("teams", v, { shouldDirty: true, shouldValidate: true })
                  }
                  placeholder={translations("Select teams")}
                />
                {errors.teams && (
                  <FieldDescription className="text-destructive">
                    {errors.teams.message as string}
                  </FieldDescription>
                )}
              </Field>
            )}
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="sendWeeklyReport"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <span className="text-sm">{translations("Send weekly report to email")}</span>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={editSurvey.isPending}>
              {editSurvey.isPending && <Spinner data-icon="inline-start" />}
              {translations("Save Changes")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GeneralSettings;

// ── MultiSelectCreatable ───────────────────────────────────────────────────────

interface MultiSelectCreatableProps {
  value: string[];
  onValueChange: (v: string[]) => void;
}

function MultiSelectCreatable({ value = [], onValueChange }: MultiSelectCreatableProps) {
  const [options, setOptions] = useState(DEFAULT_LANGUAGES);
  const [inputValue, setInputValue] = useState("");
  const { t: translations } = useTranslation();

  const trimmed = inputValue.trim();
  const hasExactMatch = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !hasExactMatch;

  const items = [
    ...options.map((o) => ({ value: o, label: o })),
    ...(canCreate ? [{ value: "$create", label: `+ ${translations("Create")} "${trimmed}"` }] : []),
  ];

  const handleValueChange = (newValues: string[]) => {
    if (newValues.includes("$create")) {
      if (!trimmed) return;
      setOptions((prev) => [...prev, trimmed]);
      onValueChange([...newValues.filter((v) => v !== "$create"), trimmed]);
    } else {
      onValueChange(newValues);
    }
    setInputValue("");
  };

  return (
    <Combobox items={items} multiple value={value} onValueChange={handleValueChange}>
      <ComboboxChips>
        <ComboboxValue>
          {value.map((v) => (
            <ComboboxChip key={v}>{v}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput
          placeholder={value.length ? "" : translations("Select languages")}
          onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !inputValue && value.length) {
              onValueChange(value.slice(0, -1));
            }
          }}
        />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{translations("No languages found")}</ComboboxEmpty>
        <ComboboxList>
          {(item: { value: string; label: string }) => (
            <ComboboxItem
              key={item.value}
              value={item.value}
              className={item.value === "$create" ? "text-primary font-medium" : ""}
            >
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
