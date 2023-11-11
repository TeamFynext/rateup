import {
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Radio,
  TextInput,
  MultiSelect,
} from "@mantine/core";
import {
  PillsInput,
  Pill,
  Combobox,
  CheckIcon,
  useCombobox,
} from "@mantine/core";
import { useCreateSurveyMutation } from "../../backend/surveys/surveys.query";
import { notifications } from "@mantine/notifications";
import { useState, useEffect } from "react";
import { TeamSelector } from "../input/TeamSelector";
import { useForm } from "@mantine/form";
import { useTeamsByUser } from "../../backend/team/team.query";
import FormModalLayout from "../Modal/FormModalLayout";
import { ContainedTextField } from "../input/ContainedInput/ContainedInput";
import classes from "../input/ContainedInput/ContainedInput.module.css";

interface FormValues {
  title: string;
  languages: Array<string>;
  teamId: string;
  type: string;
  getLocation: boolean;
}
let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);

interface CreateSurveyModalProps {
  open: boolean;
  close: () => void;
  surveyType?: "web" | "whatsapp";
  onCreate?: (survey: Survey) => void;
}
export function CreateSurveyModal({
  open,
  close,
  surveyType,
  onCreate = (_) => {},
}: CreateSurveyModalProps) {
  const [languages, setLanguages] = useState<string[]>([]);
  const [teamChoice, setTeamChoice] = useState("all");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error,
  } = useTeamsByUser();

  const allTeams = teamRes?.data?.map((team) => team?.id);
  const teamOptions = teamRes?.data?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));

  const form = useForm({
    initialValues: {
      title: "",
      languages: [],
      teamIds: [],
      type: surveyType ? surveyType : "web",
      getLocation: false,
    },
    validate: {
      title: (value) => (value?.length ? null : "Cannot be empty"),
      languages: (values) =>
        values?.length ? null : "Must contain atleast one language",
      teamIds: (values) =>
        values?.length ? null : "Must contain atleast one team",
      type: (value) => (value ? null : "Must select a type"),
    },
  });

  useEffect(() => {
    form.setFieldValue("languages", languages);
  }, [languages]);

  useEffect(() => {
    form.setFieldValue("teamIds", selectedTeams);
  }, [selectedTeams]);

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
    if (teamChoice === "all" && !arraysEqual(form?.values?.teamIds, allTeams)) {
      form.setFieldValue("teamIds", allTeams);
    }
  }, [allTeams, teamChoice, form?.values?.teamIds]);

  const resetForm = () => {
    form.reset();
    setLanguages([]);
  };

  useEffect(() => {
    form.reset();
    setLanguages([]);
  }, [open]);

  const [isCreating, setIsCreating] = useState(false);
  const createSurveyMutation = useCreateSurveyMutation((data) => {
    close();
    setIsCreating(false);
    resetForm();
    onCreate(data);
  });

  const onSubmit = (values) => {
    const validationRes = form.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    setIsCreating(true);
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Creating survey..",
      message: `Hold on, your survey is getting created...`,
      autoClose: false,
      withCloseButton: false,
    });
    createSurveyMutation.mutate(form.values);
  };
  return (
    <FormModalLayout
      opened={open}
      onClose={() => {
        close();
        form.reset();
      }}
      title={"Create Survey"}
      centered
      onSubmit={form.onSubmit(onSubmit)}
      buttonTitle={"Submit"}
    >
      <Stack style={{ minHeight: "300px" }} mt="xl">
        <ContainedTextField
          placeholder="Enter title"
          label="Title"
          withAsterisk
          {...form.getInputProps("title")}
        />
        {/* // TODO: Add a user-level language list */}
        <MultiSelectCreatable
          value={languages}
          setValue={setLanguages}
          errors={form.errors.languages}
        />
        <Radio.Group
          value={teamChoice}
          onChange={setTeamChoice}
          name="selectTeams"
          label="Select teams"
          withAsterisk
        >
          <Group mt="xs">
            <Radio checked label="All teams" value="all" />
            <Radio label="Select Manually" value="manual" />
          </Group>
        </Radio.Group>

        {teamChoice === "manual" && (
          <MultiSelect
            radius="md"
            value={selectedTeams}
            onChange={setSelectedTeams}
            placeholder="Select teams (type in to search)"
            data={teamOptions}
            searchable
            error={form.errors.teamIds}
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
          radius="md"
          error={errors ? errors : false}
          label="Languages"
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
