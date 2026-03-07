"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  CheckIcon,
  Combobox,
  ComboboxChevron,
  Group,
  Loader,
  LoadingOverlay,
  MultiSelect,
  Pill,
  PillsInput,
  Radio,
  Select,
  Stack,
  useCombobox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { CreateSurveyResponse } from "../../backend/surveys/survey.api";
import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { useAllThemes } from "../../backend/surveyTheme/surveyTheme.query";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import FormModalLayout from "../Modal/FormModalLayout";

interface FormValues {
  title: string;
  languages: Array<string>;
  teamId: string;
  type: string;
  getLocation: boolean;
}
let Languages = new Set([
  "English",
  "മലയാളം",
  "Deutsch",
  "हिन्दी",
  "ಕನ್ನಡ",
  "Français",
  "عربي",
  "தமிழ்",
]);
const defaultLanguage = "English";

interface CreateSurveyModalProps {
  open: boolean;
  close: () => void;
  surveyType: "web" | "whatsapp";
  teamsData: any;
  template?: any;
  setTemplate?: any;
}
export function CreateSurveyModal({
  open,
  close,
  surveyType,
  teamsData,
  template,
  setTemplate,
}: CreateSurveyModalProps) {
  const [languages, setLanguages] = useState<string[]>([defaultLanguage]);
  const [teamChoice, setTeamChoice] = useState("all");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const router = useRouter();
  const translations = useTranslations();
  const [prevOpen, setPrevOpen] = useState(false);
  const searchParams = useSearchParams();
  const tmp = searchParams.get("tmp");
  const tn = searchParams.get("tn");

  const [templateId, setTemplateId] = useState(template?.id || tmp || null);
  const [templateName, setTemplateName] = useState(
    template?.title || tn || null,
  );

  const { data: allThemesArr, isPending: isAllThemesFetchPending } =
    useAllThemes();
  const selectThemeDropdownData = allThemesArr?.map(({ id, name }) => {
    return {
      value: id,
      label: name,
    };
  });

  const allTeams = teamsData?.map((team) => team?.id);
  const teamOptions = teamsData?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));

  const form = useForm({
    initialValues: {
      title: templateName ? templateName : "",
      languages: languages,
      teamIds: [],
      getLocation: false,
      selectedTheme: "",
    },
    validate: {
      title: (value) =>
        templateName || value?.length ? null : "Cannot be empty",
      languages: (values) =>
        values?.length
          ? null
          : translations("Must contain at least one language"),
      teamIds: (values) =>
        values?.length ? null : translations("Must contain atleast one team"),
    },
  });

  useEffect(() => {
    if (template) {
      setTemplateId(template?.id);
      setTemplateName(template?.title);
    }
  }, [template]);

  useEffect(() => {
    form.setFieldValue("title", templateName);
  }, [templateName]);

  useEffect(() => {
    if (prevOpen === true && open === false && setTemplate) {
      setTemplate(null);
      setTemplateName(null);
      setTemplateId(null);
    }
    setPrevOpen(open);
  }, [open]);

  useEffect(() => {
    form.setFieldValue("languages", languages);
  }, [languages]);

  useEffect(() => {
    form.setFieldValue("teamIds", selectedTeams);
  }, [selectedTeams]);

  useEffect(() => {
    if (!form.getValues().selectedTheme) {
      const defaultThemeId = allThemesArr?.find(
        (themeObj) => themeObj.name === "Default Theme",
      )?.id;
      form.setFieldValue("selectedTheme", defaultThemeId || "");
    }
  }, [allThemesArr, open, form.values?.selectedTheme]);

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
    setSelectedTeams([]);
  }, [teamChoice]);

  useEffect(() => {
    if (teamChoice === "all" && !arraysEqual(form?.values?.teamIds, allTeams)) {
      form.setFieldValue("teamIds", allTeams);
    }
  }, [allTeams, teamChoice, form?.values?.teamIds]);

  const resetForm = () => {
    form.reset();
    setLanguages([defaultLanguage]);
  };

  useEffect(() => {
    form.reset();
    setLanguages([defaultLanguage]);
  }, [open]);

  function handleClose() {
    close();
    resetForm();
  }

  const [isLoading, { toggle: setIsLoading }] = useDisclosure(false);
  const createSurveyMutation = useCreateSurveyMutation();
  const queryClient = useQueryClient();

  const onSubmit = () => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    toast.loading(translations("Hold on, your survey is getting created"), {
      id: "load-data",
    });
    createSurveyMutation.mutate(
      { ...form.values, type: surveyType, templateId: templateId || "" },
      {
        onSuccess: (data: CreateSurveyResponse) => {
          queryClient.invalidateQueries({ queryKey: ["whatsappsurveys"] });
          queryClient.invalidateQueries({ queryKey: ["surveys"] });
          if (data?.id) {
            setIsLoading();
            router.push(`/dashboard/surveys/${data?.id}`);
          }
        },
        onError: (error) => {
          toast.dismiss("load-data");
        },
      },
    );
  };
  return isLoading ? (
    <LoadingOverlay
      visible={isLoading}
      zIndex={1000}
      overlayProps={{ radius: "sm", blur: 2 }}
      loaderProps={{
        type: "bars",
        color: "var(--tertiary-color)",
      }}
    />
  ) : (
    <FormModalLayout
      opened={open}
      onClose={handleClose}
      title={translations("Create Survey")}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={translations("Submit")}
    >
      <Stack style={{ minHeight: "300px" }} mt="xl">
        <ContainedTextField
          placeholder={
            templateName === null ? translations("Enter title") : templateName
          }
          label={
            templateName === null
              ? translations("Title")
              : translations("Template Selected")
          }
          withAsterisk
          {...form.getInputProps("title")}
          disabled={templateName !== null}
        />
        {/* // TODO: Add a user-level language list */}

        {templateName === null && (
          <MultiSelectCreatable
            value={languages}
            setValue={setLanguages}
            errors={form.errors.languages}
          />
        )}

        <Radio.Group
          value={teamChoice}
          onChange={setTeamChoice}
          name="selectTeams"
          label={translations("Select teams")}
          withAsterisk
        >
          <Group mt="xs">
            <Radio checked label={translations("All Teams")} value="all" />
            <Radio label={translations("Select Manually")} value="manual" />
          </Group>
        </Radio.Group>

        {teamChoice === "manual" && (
          <MultiSelect
            radius="md"
            value={selectedTeams}
            onChange={setSelectedTeams}
            placeholder={translations("Select teams (type in to search)")}
            data={teamOptions}
            searchable
            error={form.errors.teamIds}
          />
        )}

        {!template && (
          <Select
            label={translations("Select Theme")}
            data={selectThemeDropdownData}
            value={form.getValues().selectedTheme}
            onChange={(value) => form.setFieldValue("selectedTheme", value)}
            placeholder={translations("Select Theme")}
            styles={{
              input: {
                borderRadius: "0.5rem",
                paddingTop: "0.23125rem",
                paddingBottom: "0.23125rem",
              },
            }}
            rightSection={
              isAllThemesFetchPending ? (
                <Loader size={"1rem"} />
              ) : (
                <ComboboxChevron />
              )
            }
          />
        )}

        {/* {form.values.type !== "whatsapp" && (
            <Box>
              <Switch
                label="Save Respondent's location"
                {...form.getInputProps("getLocation")}
              />
              <Text c="dimmed" fz="xs">
                {`(Automatically fetched from the browser if the respondent allows it.)`}
              </Text>
            </Box>
          )} */}
      </Stack>
    </FormModalLayout>
  );
}

interface iProps {
  value: string[];
  setValue: React.Dispatch<React.SetStateAction<string[]>>;
  errors: any;
}

export function MultiSelectCreatable({ value, setValue, errors }: iProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });
  const translations = useTranslations();
  useEffect(() => {
    console.log(errors);
  }, [errors]);

  let languages = Array.from(Languages);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(languages);

  const exactOptionMatch = data.some((item) => item === search);

  const handleValueSelect = (val: string) => {
    if (val === "$create") {
      setData((current) => [...current, search]);
      setValue((current) => [...current, search]);
      setSearch("");
    } else {
      setValue((current) =>
        current.includes(val)
          ? current.filter((v) => v !== val)
          : [...current, val],
      );
    }
  };

  const handleValueRemove = (val: string) =>
    setValue((current) => current.filter((v) => v !== val));

  const values = value?.map((item) => (
    <Pill key={item} withRemoveButton onRemove={() => handleValueRemove(item)}>
      {item}
    </Pill>
  ));

  const options = languages
    .filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
    .map((item) => (
      <Combobox.Option
        title={translations("Language")}
        value={item}
        key={item}
        active={value?.includes(item)}
      >
        <Group gap="sm">
          {value?.includes(item) ? <CheckIcon size={12} /> : null}
          <span>{item}</span>
        </Group>
      </Combobox.Option>
    ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleValueSelect}
      withinPortal={false}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          radius="md"
          error={errors ? errors : false}
          label={translations("Select Languages")}
          description={translations("*Type to add new languages")}
          styles={{ description: { color: "var(--tertiary-color)" } }}
          withAsterisk
          onClick={() => combobox.openDropdown()}
        >
          <Pill.Group p="4px">
            {values}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder={translations("Select languages")}
                onChange={(event) => {
                  combobox.updateSelectedOptionIndex();
                  setSearch(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && search.length === 0) {
                    event.preventDefault();
                    handleValueRemove(value[value.length - 1]);
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>

      <Combobox.Dropdown>
        <Combobox.Options>
          {options}

          {!exactOptionMatch && search.trim().length > 0 && (
            <Combobox.Option value="$create">
              + {translations("Create")} {search}
            </Combobox.Option>
          )}

          {exactOptionMatch &&
            search.trim().length > 0 &&
            options.length === 0 && (
              <Combobox.Empty>{translations("Nothing found")}</Combobox.Empty>
            )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
