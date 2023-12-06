import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { MultiSelect, Paper, Select } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function DDMSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

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
  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <MultiSelect
        style={{ minWidth: "300px", maxWidth: "500px" }}
        data={data}
        value={selectedOp}
        onChange={handleSelectedOp}
        placeholder="Select one or more"
        classNames={{
          input: classes.selectBox,
          root: classes.input,
        }}
      />
    </Paper>
  );
}
