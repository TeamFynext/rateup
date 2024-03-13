import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Radio, Stack, TextInput } from "@mantine/core";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";
import FormPaperLayout from "./layout/FormPaperLayout";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
  features?: Record<string, any>;
}

export function MCQForm({ previewChoices, features }: Readonly<MCQFormProps>) {
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
    <Stack w={"100%"}>
      <Radio.Group value={selectedOp} onChange={handleSelectedOp} mr={"sm"}>
        <SingleSelectCard data={data} selectedValue={selectedOp} />
      </Radio.Group>
      {features?.[selectedLanguage]?.other && (
        <FormPaperLayout>
          <TextInput
            placeholder="other"
            value={response?.other || ""}
            onChange={(e) =>
              !e.currentTarget.value?.length
                ? updateResponse(null)
                : updateResponse({ other: e.currentTarget.value })
            }
            variant="unstyled"
          />
        </FormPaperLayout>
      )}
    </Stack>
  );
}
