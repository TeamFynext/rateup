"use client";

import { useContext, useEffect, useState } from "react";

import { Radio, ScrollArea } from "@mantine/core";
import { useAnimate } from "motion/react";

import { sampleChoices } from "@/utils/constants/forms.ts";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard.tsx";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function CustomNPSForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

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

  const handleSelectedOp = async (value) => {
    const res = options?.find((op) => op?.value === value);
    updateResponse(res);
    const selectedEle = scope.current?.querySelector(
      `.mantine-focus-auto[data-value="${value}"]`,
    );
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedEle) {
        await animate(
          selectedEle,
          { opacity: [0, 1, 0, 1] },
          { duration: 0.75 },
        );
      }
      nextFn?.(res);
    }
  };

  return (
    <ScrollArea.Autosize mah={"40vh"} p={0} m={0} w={"100%"}>
      <Radio.Group
        value={selectedOp}
        onChange={handleSelectedOp}
        mr={"sm"}
        ref={scope}
      >
        <SingleSelectCard data={data} selectedValue={selectedOp} />
      </Radio.Group>
    </ScrollArea.Autosize>
  );
}

