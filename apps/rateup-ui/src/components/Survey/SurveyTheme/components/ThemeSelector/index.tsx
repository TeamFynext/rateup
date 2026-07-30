import { useCallback, useState } from "react";

import { useSurveyThemeStateDispatch } from "../../SurveyThemeContext.tsx";
import type { SurveyThemePage } from "../../surveyThemeReducer.ts";
import ComboBoxComponent from "./ComboBoxComponent/index.tsx";
import { getOptions } from "./constants.tsx";
import CreateNewThemeModal from "./CreateNewThemeModal.tsx";
import RenameThemeModal from "./RenameThemeModal.tsx";

function ThemeSelector({
  className = "",
  themeSelectorState,
  setThemeSelectorState,
  allThemesArr = [],
  isAllThemesFetchPending,
  survey,
}: {
  themeSelectorState: string;
  setThemeSelectorState: (id: string) => void;
  allThemesArr?: Array<{ id: string; name: string; theme?: Record<string, SurveyThemePage> }>;
  isAllThemesFetchPending?: boolean;
  survey: Survey;
  className?: string;
}) {
  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const [isRenameThemeModalOpened, setIsRenameThemeModalOpened] = useState(false);
  const [selectedThemeIdToBeRenamed, setSelectedThemeIdToBeRename] = useState(null);
  const [selectedThemesThemeName, setSelectedThemesThemeName] = useState("");

  const handleChange = useCallback(
    (value: string) => {
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
    (themeId: string) => {
      const themeObj = allThemesArr?.find((obj) => obj.id === themeId);
      if (themeObj) {
        const { name = "" } = themeObj;
        setSelectedThemeIdToBeRename(themeId);
        setSelectedThemesThemeName(name);
        setIsRenameThemeModalOpened(true);
      }
    },
    [allThemesArr],
  );

  const handleCloseRenameThemeModal = useCallback(() => {
    setSelectedThemeIdToBeRename(null);
    setSelectedThemesThemeName("");
    setIsRenameThemeModalOpened(false);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ComboBoxComponent
        className={`flex-1 choose-theme-dropdown`}
        classNames={{
          option:
            "w-full [&>div]:w-full hover:bg-gray-50 data-[combobox-active=true]:bg-primary data-[combobox-active=true]:text-white data-[combobox-active=true]:hover:bg-primary",
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
    </div>
  );
}

export default ThemeSelector;
