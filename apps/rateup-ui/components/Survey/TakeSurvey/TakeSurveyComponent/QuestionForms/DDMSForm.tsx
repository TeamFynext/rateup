import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { MultiSelect, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import FormPaperLayout from "./layout/FormPaperLayout";
import { useMediaQuery } from "@mantine/hooks";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const isMobile = useMediaQuery("(max-width: 480px)");

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
  return (
    <FormPaperLayout>
      <MultiSelect
        style={{ minWidth: "300px", maxWidth: "500px" }}
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
            color: "var(--mantine-color-white)",
            backgroundColor: `var(--mantine-color-${theme.primaryColor}-filled)`,
          },
        }}
        searchable
      />
    </FormPaperLayout>
  );
}
