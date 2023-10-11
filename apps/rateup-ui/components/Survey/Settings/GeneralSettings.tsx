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
} from "@mantine/core";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import { useForm } from "@mantine/form";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";

let Languages = new Set(["English", "Malayalam", "Hindi", "Kannada", "Tamil"]);
const GeneralSettings = ({ survey }) => {
  const [kioskMode, setKioskMode] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const surveyForm = useForm({
    initialValues: {
      title: "",
      languages: [],
    },
    validate: {
      title: (value) => (value.length ? null : "Cannot be empty"),
      languages: (values) =>
        values.length ? null : "Must contain atleast one language",
    },
  });
  useEffect(() => {
    surveyForm.setValues({
      title: survey?.title || "",
      languages: survey?.languages || "",
    });
    setKioskMode(survey?.kioskMode);
    setLanguages(survey?.languages);
  }, [survey]);

  useEffect(() => {
    surveyForm.setFieldValue("languages", languages);
    console.log(languages);
  }, [languages]);

  const [isLoading, setIsLoading] = useState(false);
  const editSurvey = useEditSurveyMutation(survey?.id, setIsLoading);
  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      title: values.title,
      languages: values.languages,
      kioskMode: kioskMode,
    };
    editSurvey.mutate(data);
  };
  return (
    <PaperLayout>
      <form onSubmit={surveyForm.onSubmit(onSubmit)} style={{ gap: "20px" }}>
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
        <Grid justify="flex-end" mt={"md"}>
          <Grid.Col span={2}>
            <RateupButtonSecondary
              type="submit"
              color="var(--tertiary-color)"
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
