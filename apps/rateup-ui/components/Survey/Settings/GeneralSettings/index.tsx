"use client";

import React, { useEffect, useState } from "react";

import {
  Box,
  CheckIcon,
  Combobox,
  Grid,
  Group,
  MultiSelect,
  Pill,
  PillsInput,
  Stack,
  Switch,
  useCombobox,
} from "@mantine/core";
import { hasLength, isNotEmpty, useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useExtracted } from "next-intl";

import { useEditSurveyMutation } from "../../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../../backend/team/team.query";
import { docsPath, SAVE_HOTKEY } from "../../../../utils/constants";
import InfoButton from "../../../Button/InfoButton";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import styles from "./GeneralSettings.module.css";

const Languages = new Set([
  "English",
  "Malayalam",
  "Hindi",
  "Kannada",
  "Tamil",
]);
const GeneralSettings = ({ survey, enabledModules, setSelectedLanguage }) => {
  const translations = useExtracted();
  const settingsForm = useForm({
    initialValues: {
      title: survey?.title || "",
      languages: survey?.langauges || [],
      teams: survey?.teams?.map((team) => team?.id) || [],
      sendWeeklyReport: survey?.sendWeeklyReport || true,
    },
    validate: {
      title: isNotEmpty(translations("Cannot be Empty")),
      languages: hasLength(
        { min: 1 },
        translations("Must contain atleast one language"),
      ),
      teams: hasLength(
        { min: 1 },
        translations("Must contain atleast one team"),
      ),
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const editSurvey = useEditSurveyMutation(survey?.id);

  const handleSubmit = (values) => {
    setIsLoading(true);
    editSurvey.mutate(values, {
      onSettled: () => {
        setIsLoading(false);
        setSelectedLanguage && setSelectedLanguage(values.languages[0]);
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
    settingsForm.setFieldValue("sendWeeklyReport", survey?.sendWeeklyReport);
  }, [survey]);

  useEffect(() => {
    settingsForm.setFieldValue("languages", languages);
  }, [languages]);

  return (
    <PaperLayout
      className={`${styles["general-settings-root-div"]} section-div`}
    >
      <Box className={styles["heading-and-desc-container"]}>
        <Grid style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <h2
              className={"settings-section-heading"}
              style={{ marginRight: "1rem" }}
            >
              {translations("Survey Settings")}
            </h2>
            <InfoButton docUrl={`${docsPath}/webSurvey/shareSurvey`} />
          </div>
        </Grid>
        <p className={"settings-section-description"}>
          {translations("Choose the teams to be added")}
        </p>
      </Box>
      <form
        onSubmit={settingsForm.onSubmit(handleSubmit)}
        onKeyDown={getHotkeyHandler([
          [
            SAVE_HOTKEY,
            (event: any) => settingsForm.onSubmit(handleSubmit)(event),
          ],
        ])}
        className={styles["form"]}
      >
        {enabledModules.includes("name") && (
          <Stack className={styles["form-input-container"]}>
            <h3>{translations("Survey Name")}</h3>
            <ContainedTextField
              className={styles["form-input"]}
              withAsterisk
              placeholder={translations("Enter Survey name")}
              required
              {...settingsForm.getInputProps("title")}
            />
          </Stack>
        )}
        {enabledModules.includes("language") && (
          <Stack className={styles["form-input-container"]}>
            <h3>{translations("Survey Languages")}</h3>
            <MultiSelectCreatable
              value={languages}
              setValue={setLanguages}
              errors={settingsForm.errors.languages}
            />
          </Stack>
        )}
        {enabledModules.includes("teams") && (
          <Stack className={styles["form-input-container"]}>
            <h3>{translations("Select Teams")}</h3>
            <MultiSelect
              radius="md"
              placeholder={translations("Select teams")}
              data={teamOptions}
              {...settingsForm.getInputProps("teams")}
              error={settingsForm.errors.teams}
            />
          </Stack>
        )}
        <Group className={styles["form-input-container"]}>
          <Switch
            {...settingsForm.getInputProps("sendWeeklyReport", {
              type: "checkbox",
            })}
          />
          <h3>{translations("Send weekly report to email")}</h3>
        </Group>

        <RateupButtonBlue
          className={styles["save-changes-btn"]}
          title={translations("Save Changes")}
          type={"submit"}
          loading={isLoading}
        />
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

  const languages = Array.from(Languages);
  const [search, setSearch] = useState("");
  const [data, setData] = useState(languages);

  const exactOptionMatch = data.some((item) => item === search);
  const translations = useExtracted();
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
              {translations("+ Create ")}
              {search}
            </Combobox.Option>
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
