import { Group } from "@mantine/core";
import { useCallback, useContext, useState } from "react";
import { SurveyThemeContext } from "../../SurveyThemeContext";
import ComboBoxComponent from "./ComboBoxComponent";
import { getOptions } from "./constants";
import CreateNewThemeModal from "./CreateNewThemeModal";
import styles from "./ThemeSelector.module.css";
import RenameThemeModal from "./RenameThemeModal";
import { useDisclosure } from "@mantine/hooks";

function ThemeSelector({
  className = "",
  themeSelectorState,
  setThemeSelectorState,
  allThemesArr,
  isAllThemesFetchPending,
  survey,
}) {
  const { surveyTheme, setSurveyTheme } = useContext(SurveyThemeContext);
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
      if (themeObj) setSurveyTheme(themeObj.theme);
    },
    [allThemesArr],
  );

  const handleOpenRenameThemeModal = useCallback((themeId) => {
    const themeObj = allThemesArr?.find((obj) => obj.id === themeId);
    const { name = "" } = themeObj;
    setSelectedThemeIdToBeRename(themeId);
    setSelectedThemesThemeName(name);
    openRenameThemeModal();
  }, []);

  const handleCloseRenameThemeModal = useCallback(() => {
    setSelectedThemeIdToBeRename(null);
    setSelectedThemesThemeName("");
    closeRenameThemeModal();
  }, []);

  return (
    <Group className={className}>
      <ComboBoxComponent
        className={styles["choose-theme-dropdown"]}
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

      <CreateNewThemeModal />
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
