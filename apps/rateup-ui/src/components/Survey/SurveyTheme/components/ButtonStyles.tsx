import { useId, useCallback } from "react";

import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { COORDINATESX, COORDINATESY } from "@/utils/constants.ts";

import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function ButtonStyles() {
  const uid = useId();
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { button } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)!];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleBackgroundColorChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "button-background-color-change",
      payload: value,
    });
  }, []);

  const handleTextColorChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "button-text-color-change",
      payload: value,
    });
  }, []);

  const handleXCoOrdinateChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "button-x-coordinate-change",
      payload: value,
    });
  }, []);

  const handleYCoOrdinateChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "button-y-coordinate-change",
      payload: value,
    });
  }, []);

  return (
    <div
      className={`flex flex-col ${styles["style-inputs-container"]} style-inputs-container ${styles["button-styles-div"]}`}
    >
      <div className={"custom-color-picker-and-heading-container"}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={String(button?.styles?.backgroundColor ?? "")}
          onChange={handleBackgroundColorChange}
          withoutEyedropper
        />
      </div>

      <div className={"custom-color-picker-and-heading-container"}>
        <h2>Text Color</h2>
        <CustomColorPicker
          value={String(button?.styles?.color ?? "")}
          onChange={handleTextColorChange}
          withoutEyedropper
        />
      </div>

      {selectedPageTab === ThemeTabEnum.WELCOME && (
        <div className={"styles-section-div button-position-styles-div"}>
          <h2>Button position</h2>
          <div className="flex gap-3">
            <Field>
              <FieldLabel htmlFor={`${uid}-x-axis`}>x axis</FieldLabel>
              <Select
                value={button?.position?.x ?? COORDINATESX?.[1]}
                onValueChange={handleXCoOrdinateChange}
                items={COORDINATESX.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id={`${uid}-x-axis`} className="h-9 w-full text-xs">
                  <SelectValue placeholder="X axis" />
                </SelectTrigger>
                <SelectContent className="min-w-[120px]">
                  {COORDINATESX.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${uid}-y-axis`}>y axis</FieldLabel>
              <Select
                value={button?.position?.y ?? COORDINATESY?.[3]}
                onValueChange={handleYCoOrdinateChange}
                items={COORDINATESY.map((c) => ({ value: c, label: c }))}
              >
                <SelectTrigger id={`${uid}-y-axis`} className="h-9 w-full text-xs">
                  <SelectValue placeholder="Y axis" />
                </SelectTrigger>
                <SelectContent className="min-w-[120px]">
                  {COORDINATESY.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

export default ButtonStyles;
