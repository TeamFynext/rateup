import { Group } from "@mantine/core";
import { useCallback, useContext } from "react";
import { SurveyThemeContext } from "../../SurveyThemeContext";
import ComboBoxComponent from "./ComboBoxComponent";
import { getOptions } from "./constants";
import CreateNewThemeModal from "./CreateNewThemeModal";
import styles from "./ThemeSelector.module.css";

function ThemeSelector({
  themeSelectorState,
  setThemeSelectorState,
  allThemesArr,
  isAllThemesFetchPending,
  survey,
}) {
  const { surveyTheme, setSurveyTheme } = useContext(SurveyThemeContext);

  const handleChange = useCallback(
    (value) => {
      setThemeSelectorState(value);
      const themeObj = allThemesArr?.find((obj) => obj.id === value);
      if (themeObj) setSurveyTheme(themeObj.theme);
    },
    [allThemesArr],
  );

  return (
    <Group>
      {/* <Tooltip label={"Choose Theme"}>
        <Select 
          className={styles["choose-theme-dropdown"]}
          placeholder="choose theme"
          data={getOptions(allThemesArr, survey?.savedSurveyThemeId)}
          allowDeselect={false}
          value={themeSelectorState}
          rightSection={isAllThemesFetchPending?<Loader size={"1rem"} />: <ComboboxChevron />}
          onChange={handleChange}
          renderOption={RenderOption}        
          classNames={{
            option: styles["choose-theme-dropdown-option"],
          }}
        />
      </Tooltip>       */}

      <ComboBoxComponent
        className={styles["choose-theme-dropdown"]}
        classNames={{
          option: styles["choose-theme-dropdown-option"],
        }}
        value={themeSelectorState}
        data={getOptions(allThemesArr)}
        onChange={handleChange}
        renderOptionProps={{
          surveyActiveThemeId: survey?.savedSurveyThemeId,
          comboboxHandleChange: handleChange,
        }}
        isLoading={isAllThemesFetchPending}
      />

      <CreateNewThemeModal />
    </Group>
  );
}

export default ThemeSelector;
