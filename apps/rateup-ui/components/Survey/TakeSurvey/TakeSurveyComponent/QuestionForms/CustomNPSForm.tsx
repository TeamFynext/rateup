import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Radio, ScrollArea } from "@mantine/core";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function CustomNPSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const { nextFn, prevFn } = useHandleNextPrevFuncs();

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
    nextFn?.();
  };
  return (
    <ScrollArea.Autosize mah={"40vh"} p={0} m={0} w={"100%"}>
      <Radio.Group value={selectedOp} onChange={handleSelectedOp} mr={"sm"}>
        <SingleSelectCard data={data} selectedValue={selectedOp} />
      </Radio.Group>
    </ScrollArea.Autosize>
  );
}
