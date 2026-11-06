import { useAnimate } from "motion/react";
import { useContext, useEffect, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { sampleChoices } from "@/utils/constants/forms.ts";
import { asAnswer } from "@/utils/response.ts";

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
  const data = options?.map((op: Choice) => op?.value);
  useEffect(() => {
    if (response) {
      setSelectedOp(asAnswer(response).value ?? "");
    }
  }, [response]);

  const handleSelectedOp = async (value: string) => {
    const res = options?.find((op: Choice) => op?.value === value);
    updateResponse(res);
    const selectedEle = scope.current?.querySelector(`[data-value="${value}"]`);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedEle) {
        await animate(selectedEle, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
      }
      nextFn?.(res);
    }
  };

  return (
    <ScrollArea className="mr-3 max-h-[40vh] w-full">
      <div ref={scope}>
        <SingleSelectCard data={data} selectedValue={selectedOp} onChange={handleSelectedOp} />
      </div>
    </ScrollArea>
  );
}
