import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { FocusTrap, Input, Radio, Stack } from "@mantine/core";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";
import FormPaperLayout from "./layout/FormPaperLayout";
import classes from "../TakeSurvey.module.css";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
  features?: Record<string, any>;
}

export function MCQForm({ previewChoices, features }: Readonly<MCQFormProps>) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [selectedOp, setSelectedOp] = useState("");
  const selectedFeature = features?.[selectedLanguage];
  const [active, setActive] = useState(false);

  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op) => op?.value);

  useEffect(() => {
    if (response) {
      if (response?.value) {
        if (selectedOp !== response?.value) setSelectedOp(response.value);
      } else if (response?.other) {
        setSelectedOp(selectedFeature?.other?.title);
      }
    }
  }, [response]);

  const handleSelectedOp = (value) => {
    setSelectedOp(value);
    if (value !== selectedFeature?.other?.title) {
      const res = options?.find((op) => op?.value === value);
      updateResponse(res);
      setActive(false);
    } else {
      setActive(true);
      updateResponse(null);
    }
  };

  if (selectedFeature?.other?.isEnabled) {
    data.push(selectedFeature?.other?.title);
  } else {
    data.filter((op) => op !== selectedFeature?.other?.title);
  }

  return (
    <Stack w={"100%"} mr="sm">
      <Radio.Group value={selectedOp} onChange={handleSelectedOp}>
        <SingleSelectCard data={data} selectedValue={selectedOp} />
      </Radio.Group>
      {selectedFeature?.other?.isEnabled &&
      selectedOp === selectedFeature?.other?.title ? (
        <FormPaperLayout>
          <FocusTrap active={active}>
            <Input
              placeholder={selectedFeature?.other?.placeholder}
              value={response?.other || ""}
              onChange={(e) =>
                !e.currentTarget.value?.length
                  ? updateResponse(null)
                  : updateResponse({ other: e.currentTarget.value })
              }
              variant="unstyled"
              classNames={{
                input: classes.input,
              }}
              data-autofocus
            />
          </FocusTrap>
        </FormPaperLayout>
      ) : null}
    </Stack>
  );
}
