import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Checkbox, Stack } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function MSQForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState([]);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
    ? previewChoices?.[selectedLanguage]
    : sampleChoices;

  const data = options?.map((op) => op?.value);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  useEffect(() => {
    if (selectedOp.length) {
      const res = selectedOp?.map((s) => {
        // @ts-ignore
        return options.find((op) => op?.value === s);
      });
      updateResponse(res);
    }
  }, [selectedOp]);
  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => r?.value));
    }
  }, []);

  return (
    <Checkbox.Group value={selectedOp} onChange={setSelectedOp}>
      <Stack>
        {data?.map((choice) => (
          <Checkbox
            value={choice}
            key={choice}
            label={choice}
            classNames={{
              label: classes.input,
            }}
          />
        ))}
      </Stack>
    </Checkbox.Group>
  );
}
