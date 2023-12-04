import React, { useState, useEffect } from "react";
import {
  Text,
  Grid,
  Group,
  Switch,
  PillsInput,
  Pill,
  Combobox,
  CheckIcon,
  useCombobox,
  MultiSelect,
} from "@mantine/core";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { useForm, zodResolver } from "@mantine/form";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { z } from "zod";

let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
const GeneralSettings = ({ survey, enabledModules }) => {
  const [kioskMode, setKioskMode] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState(null);

  const { data: teamRes } = useTeamsByUser();

  const teamOptions = (teamRes?.data || []).map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  const schema = z.object({
    title: z.string().trim().min(1, { message: "Cannot be empty" }),
    languages: z
      .array(z.string())
      .min(1, { message: "Must contain atleast one language" }),
    teams: z
      .array(z.string())
      .min(1, { message: "Must contain atleast one team" }),
    email: z.string().trim().email({ message: "Invalid email" }),
  });
  const surveyForm = useForm({
    initialValues: {
      title: "",
      languages: [],
      teams: [],
      skipPreview: false,
      getLocation: false,
      sendSurveyResponse: false,
      email: "",
    },
    validate: zodResolver(schema),
  });
  useEffect(() => {
    surveyForm.setValues({
      title: survey?.title || "",
      languages: survey?.languages || [],
      teams: survey?.teams?.map((team) => team?.id) || [],
      skipPreview: survey?.skipPreview || false,
      getLocation: survey?.getLocation || false,
      sendSurveyResponse: survey?.sendSurveyResponse || false,
      email: survey?.email || "",
    });
    setKioskMode(survey?.kioskMode);
    setLanguages(survey?.languages);
    setSelectedTeams(survey?.teams?.map((team) => team?.id));
  }, [survey]);

  useEffect(() => {
    surveyForm.setFieldValue("languages", languages);
  }, [languages]);

  const [isLoading, setIsLoading] = useState(false);
  const editSurvey = useEditSurveyMutation(survey?.id, setIsLoading);
  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values?.title,
      languages: values?.languages,
      teams: values?.teams,
      skipPreview: values?.skipPreview,
      kioskMode: kioskMode,
      getLocation: values?.getLocation,
      sendSurveyResponse: values?.sendSurveyResponse,
      email: values?.email,
    };
    editSurvey.mutate(data);
  };
  return (
    <PaperLayout>
      <form onSubmit={surveyForm.onSubmit(onSubmit)} style={{ gap: "20px" }}>
        {enabledModules.includes("name") && (
          <Grid align="center">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Survey Name: </Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <ContainedTextField
                withAsterisk
                placeholder="Enter Survey name"
                required
                mt="md"
                {...surveyForm.getInputProps("title")}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("language") && (
          <Grid align="center" mt={"md"}>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Languages: </Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <MultiSelectCreatable
                value={languages}
                setValue={setLanguages}
                errors={surveyForm.errors.languages}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("teams") && (
          <Grid align="center" mt={"md"}>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Teams: </Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <MultiSelect
                radius="md"
                placeholder="Select teams"
                value={selectedTeams}
                data={teamOptions}
                {...surveyForm.getInputProps("teams")}
                error={surveyForm.errors.teams}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("kiosk") && (
          <Grid align="center" mt="md">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Kiosk Mode:</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Switch
                size={"md"}
                onLabel="ON"
                offLabel="OFF"
                checked={kioskMode}
                onChange={(event) => {
                  setKioskMode(event.target.checked);
                }}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("preview") && (
          <Grid align="center" mt="md">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Skip Preview:</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Switch
                size={"md"}
                {...surveyForm.getInputProps("skipPreview", {
                  type: "checkbox",
                })}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("location") && (
          <Grid align="center" mt="md">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Fetch Location:</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Switch
                size={"md"}
                {...surveyForm.getInputProps("getLocation", {
                  type: "checkbox",
                })}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("sendSurveyResponse") && (
          <Grid align="center" mt="md">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Send Survey Response To Email:</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Switch
                size={"md"}
                {...surveyForm.getInputProps("sendSurveyResponse", {
                  type: "checkbox",
                })}
              />
            </Grid.Col>
          </Grid>
        )}
        {enabledModules.includes("email") && (
          <Grid align="center">
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <Text size={"md"}>Survey Response Recipient: </Text>
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 6, lg: 5, xl: 5 }}>
              <ContainedTextField
                withAsterisk
                placeholder="Enter Survey name"
                required
                mt="md"
                {...surveyForm.getInputProps("email")}
              />
            </Grid.Col>
          </Grid>
        )}
        <Grid justify="flex-end" mt={"md"}>
          <Grid.Col span={2}>
            <RateupButtonPrimary
              type="submit"
              loading={isLoading}
              title="Save Changes"
            />
          </Grid.Col>
          <Grid.Col span={5}></Grid.Col>
        </Grid>
      </form>
    </PaperLayout>
  );
};

export default GeneralSettings;

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

  useEffect(() => {}, [errors]);

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
          : [...current, val]
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
        title="Language"
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
          error={errors ? errors : false}
          withAsterisk
          onClick={() => combobox.openDropdown()}
          radius={"12px"}
        >
          <Pill.Group>
            {values}

            <Combobox.EventsTarget>
              <PillsInput.Field
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                value={search}
                placeholder="Select languages"
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
            <Combobox.Option value="$create">+ Create {search}</Combobox.Option>
          )}

          {exactOptionMatch &&
            search.trim().length > 0 &&
            options.length === 0 && (
              <Combobox.Empty>Nothing found</Combobox.Empty>
            )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
