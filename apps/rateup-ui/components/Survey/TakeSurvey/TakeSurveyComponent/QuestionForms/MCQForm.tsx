import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { ScrollArea, SegmentedControl, Stack } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function MCQForm({ previewChoices }: MCQFormProps) {
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

  return (
    <Stack>
      <ScrollArea.Autosize mah={"30vh"} maw={"90vh"}>
        <Stack ml="sm" mr="xs">
          <SegmentedControl
            data={data}
            value={selectedOp}
            onChange={handleSelectedOp}
            orientation={"vertical"}
            color="var(--tertiary-color)"
            size="md"
            classNames={{
              label: classes.sglabel,
              root: classes.sgRoot,
              control: classes.sgControl,
              indicator: classes.sgMcqIndicator,
            }}
            style={{
              gap: "7px",
            }}
          />
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
