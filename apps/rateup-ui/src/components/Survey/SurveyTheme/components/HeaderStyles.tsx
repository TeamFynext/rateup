import { useId, useCallback } from "react";

import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import CustomColorPicker from "../../ShareSurvey/components/CustomColorPicker/index.tsx";
import { FontWeights, getSurveyThemeKeyOf } from "../SurveyTheme.constants";
import {
  useSelectedPageTab,
  useSurveyThemeContextValue,
  useSurveyThemeStateDispatch,
} from "../SurveyThemeContext.tsx";

import styles from "./stylescomponent/StylesComponent.module.css";

function HeaderStyles() {
  const uid = useId();
  const selectedPageTab = useSelectedPageTab();
  const surveyTheme = useSurveyThemeContextValue();
  const { title } = surveyTheme[getSurveyThemeKeyOf(selectedPageTab)!];

  const surveyThemeDispatch = useSurveyThemeStateDispatch();

  const handleColorChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "title-color-change",
      payload: value,
    });
  }, []);

  const handleFontWeightChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "title-font-weight-change",
      payload: value,
    });
  }, []);

  const handleFontSizeChange = useCallback((value: string | number) => {
    surveyThemeDispatch({
      type: "title-font-size-change",
      payload: value,
    });
  }, []);

  return (
    <div
      className={`flex flex-col ${styles["style-inputs-container"]} ${styles["header-styles"]} style-inputs-container header-style-inputs-container`}
    >
      <div className={"custom-color-picker-and-heading-container"}>
        <h2>Text Color</h2>
        <CustomColorPicker
          value={title.styles.color}
          onChange={handleColorChange}
          withoutEyedropper
        />
      </div>
      <div className="flex flex-nowrap gap-2.5">
        <Field>
          <FieldLabel htmlFor={`${uid}-font-weight`} className={styles["label"]}>
            Font weight
          </FieldLabel>
          <Select
            value={title.styles.fontWeight}
            onValueChange={handleFontWeightChange}
            items={FontWeights}
          >
            <SelectTrigger id={`${uid}-font-weight`} className="w-full rounded-xl">
              <SelectValue placeholder="Font weight" />
            </SelectTrigger>
            <SelectContent className="min-w-[130px]">
              {FontWeights.map((fw) => (
                <SelectItem key={fw.value} value={fw.value}>
                  {fw.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-font-size`} className={styles["label"]}>
            Font Size
          </FieldLabel>
          <Input
            id={`${uid}-font-size`}
            type="number"
            min={10}
            max={100}
            placeholder="size"
            name="fontSize"
            value={title.styles.fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="rounded-xl"
          />
        </Field>
      </div>
    </div>
  );
}

export default HeaderStyles;
