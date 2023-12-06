import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Paper, Select } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";

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
    if (selectedOp) {
      // @ts-ignore
      const res = options?.find((op) => op?.value === selectedOp);
      updateResponse(res);
    } else {
      updateResponse(response);
    }
  }, [selectedOp, response]);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Select
        style={{ minWidth: "300px", maxWidth: "500px" }}
        placeholder="Select one"
        data={data}
        value={response ? response?.value : selectedOp}
        onChange={setSelectedOp}
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
      />
    </Paper>
  );
}
