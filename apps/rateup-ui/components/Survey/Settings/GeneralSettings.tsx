import React, { useState, useEffect } from "react";
import {
  Text,
  Grid,
  Group,
  PillsInput,
  Pill,
  Combobox,
  CheckIcon,
  useCombobox,
  MultiSelect,
  Stack,
} from "@mantine/core";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { hasLength, isNotEmpty, useForm } from "@mantine/form";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import { useTeamsByUser } from "../../../backend/team/team.query";

let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
const GeneralSettings = ({ survey, enabledModules }) => {
  const settingsForm = useForm({
    initialValues: {
      title: survey?.title || "",
      languages: survey?.langauges || [],
      teams: survey?.teams?.map((team) => team?.id) || [],
    },
    validate: {
      title: isNotEmpty("Cannot be Empty"),
      languages: hasLength({ min: 1 }, "Must contain atleast one language"),
      teams: hasLength({ min: 1 }, "Must contain atleast one team"),
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const editSurvey = useEditSurveyMutation(survey?.id);
  const handleSubmit = (values) => {
    setIsLoading(true);
    editSurvey.mutate(values, {
      onSettled: () => {
        setIsLoading(false);
      },
    });
  };
  const [languages, setLanguages] = useState<string[]>([]);
  const { data: teamRes } = useTeamsByUser();
  const teamOptions = teamRes?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));
  useEffect(() => {
    setLanguages(survey?.languages);
  }, [survey]);
  useEffect(() => {
    settingsForm.setFieldValue("languages", languages);
  }, [languages]);
  return (
    <PaperLayout shadow="xl" p={"xl"} px={50}>
      <form onSubmit={settingsForm.onSubmit(handleSubmit)}>
        <Stack gap={"lg"}>
          {enabledModules.includes("name") && (
            <Grid columns={10}>
              <Grid.Col span={4}>
                <Text>Survey Name :</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <ContainedTextField
                  withAsterisk
                  placeholder="Enter Survey name"
                  required
                  {...settingsForm.getInputProps("title")}
                />
              </Grid.Col>
            </Grid>
          )}
          {enabledModules.includes("language") && (
            <Grid columns={10}>
              <Grid.Col span={4}>
                <Text>Survey Languages :</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <MultiSelectCreatable
                  value={languages}
                  setValue={setLanguages}
                  errors={settingsForm.errors.languages}
                />
              </Grid.Col>
            </Grid>
          )}
          {enabledModules.includes("teams") && (
            <Grid columns={10}>
              <Grid.Col span={4}>
                <Text>Select Teams :</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <MultiSelect
                  radius="md"
                  placeholder="Select teams"
                  data={teamOptions}
                  {...settingsForm.getInputProps("teams")}
                  error={settingsForm.errors.teams}
                />
              </Grid.Col>
            </Grid>
          )}
          <Grid columns={10}>
            <Grid.Col span={4}></Grid.Col>
            <Grid.Col span={6}>
              <RateupButtonBlue
                title="Save Changes"
                type={"submit"}
                loading={isLoading}
              />
            </Grid.Col>
          </Grid>
        </Stack>
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
