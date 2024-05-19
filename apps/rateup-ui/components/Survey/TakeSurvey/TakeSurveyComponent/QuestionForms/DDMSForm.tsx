import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  MultiSelect,
  isLightColor,
  luminance,
  useMantineTheme,
} from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useMediaQuery } from "@mantine/hooks";
import CustomMultiselectForMobile from "../components/CustomMultiselectForMobile";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const isMobile = useMediaQuery("(max-width: 480px)");

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const pillBgColor =
    luminance(themePrimaryColor) > 0.8
      ? `var(--mantine-color-gray-7)`
      : themePrimaryColor;
  const pillTextColor = isLightColor(pillBgColor) ? "#000000" : "#FFFFFF";

  const [selectedOp, setSelectedOp] = useState([]);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);

  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, [response]);

  const handleSelectedOp = (values) => {
    const res = options?.filter((op) => values?.includes(op?.value));
    updateResponse(res);
  };
  const theme = useMantineTheme();
  const pos = isMobile ? "top" : "bottom";
  return !isMobile ? (
    <FormPaperLayout>
      <MultiSelect
        data={data}
        value={selectedOp}
        onChange={handleSelectedOp}
        placeholder="Select one or more / type in to search"
        comboboxProps={{
          middlewares: {
            flip: false,
            shift: false,
          },
          position: pos,
        }}
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
        styles={{
          input: {
            backgroundColor: "transparent",
          },
          dropdown: {
            borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
            zIndex: 999,
          },
          pill: {
            color: pillTextColor,
            backgroundColor: pillBgColor,
          },
        }}
        searchable
      />
    </FormPaperLayout>
  ) : (
    <CustomMultiselectForMobile
      value={selectedOp}
      data={data}
      onChange={handleSelectedOp}
      placeholder="Select one or more"
    />
  );
}
