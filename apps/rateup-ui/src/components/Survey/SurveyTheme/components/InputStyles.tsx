import { useCallback } from "react";

import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

function InputStyles() {
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { input } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)!];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorPickerChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "input-color-change",
      payload: value,
    });
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full justify-between">
        <div className="w-full">
          <h2 className="mb-[0.3125rem] text-xs font-medium text-[#495057]">Color</h2>
          <CustomColorPicker
            value={input?.primaryColor ?? ""}
            onChange={handleColorPickerChange}
            withoutEyedropper
          />
        </div>
      </div>
    </div>
  );
}

export default InputStyles;
