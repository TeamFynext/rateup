"use client";

import { useCallback, useState } from "react";

import { Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useSurveyThemeStateDispatch } from "../../SurveyThemeContext";
import ComboBoxComponent from "./ComboBoxComponent";
import { getOptions } from "./constants";
import CreateNewThemeModal from "./CreateNewThemeModal";
import RenameThemeModal from "./RenameThemeModal";
import styles from "./ThemeSelector.module.css";

function ThemeSelector({
  className = "",
  themeSelectorState,
  setThemeSelectorState,
  allThemesArr = [],
  isAllThemesFetchPending,
  survey,
}) {
  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const [
    isRenameThemeModalOpened,
    { open: openRenameThemeModal, close: closeRenameThemeModal },
  ] = useDisclosure();
  const [selectedThemeIdToBeRenamed, setSelectedThemeIdToBeRename] =
    useState(null);
  const [selectedThemesThemeName, setSelectedThemesThemeName] = useState("");

  const handleChange = useCallback(
    (value) => {
      setThemeSelectorState(value);
      const themeObj = allThemesArr?.find((obj) => obj.id === value);
      if (themeObj) {
        surveyThemeDispatch({
          type: "set-survey-theme",
          payload: themeObj.theme,
        });
      }
    },
    [allThemesArr],
  );

  const handleOpenRenameThemeModal = useCallback(
    (themeId) => {
      const themeObj = allThemesArr?.find((obj) => obj.id === themeId);
      if (themeObj) {
        const { name = "" } = themeObj;
        setSelectedThemeIdToBeRename(themeId);
        setSelectedThemesThemeName(name);
        openRenameThemeModal();
      }
    },
    [allThemesArr],
  );

  const handleCloseRenameThemeModal = useCallback(() => {
    setSelectedThemeIdToBeRename(null);
    setSelectedThemesThemeName("");
    closeRenameThemeModal();
  }, []);

  return (
    <Group className={className}>
      <ComboBoxComponent
        className={`${styles["choose-theme-dropdown"]} choose-theme-dropdown`}
        classNames={{
          option: styles["choose-theme-dropdown-option"],
        }}
        value={themeSelectorState}
        data={getOptions(allThemesArr)}
        onChange={handleChange}
        renderOptionProps={{
          surveyActiveThemeId: survey?.webSurveyThemeId,
          comboboxHandleChange: handleChange,
          handleOpenRenameThemeModal: handleOpenRenameThemeModal,
        }}
        isLoading={isAllThemesFetchPending}
      />

      <CreateNewThemeModal
        setThemeSelectorState={setThemeSelectorState}
        surveyThemeDispatch={surveyThemeDispatch}
      />
      {isRenameThemeModalOpened && (
        <RenameThemeModal
          opened={isRenameThemeModalOpened}
          onClose={handleCloseRenameThemeModal}
          themeId={selectedThemeIdToBeRenamed}
          oldName={selectedThemesThemeName}
        />
      )}
    </Group>
  );
}

export default ThemeSelector;
