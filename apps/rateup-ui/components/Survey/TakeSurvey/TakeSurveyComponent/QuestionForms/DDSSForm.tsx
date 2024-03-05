import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Select, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import FormPaperLayout from "./layout/FormPaperLayout";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDSSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);
  useEffect(() => {
    if (response) {
      setSelectedOp(response.value);
    }
  }, [response]);

  const handleSelectedOp = (value) => {
    const res = options?.find((op) => op?.value === value);
    updateResponse(res);
  };
  const theme = useMantineTheme();
  return (
    <FormPaperLayout>
      <Select
        style={{
          minWidth: "300px",
          maxWidth: "500px",
        }}
        placeholder="Select one / type in to search"
        data={data}
        value={selectedOp}
        onChange={handleSelectedOp}
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
        styles={{
          input: {
            backgroundColor: "transparent",
          },
          dropdown: {
            backgroundColor: `var(--mantine-color-${theme.primaryColor}-filled)`,
            borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
            zIndex: 999,
          },
        }}
        searchable
      />
    </FormPaperLayout>
  );
}
