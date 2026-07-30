import { useRouterState } from "@tanstack/react-router";
import { useAnimate } from "motion/react";
import { useContext, useEffect, useState } from "react";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { samplePictureChoices } from "@/utils/constants/forms.ts";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard.tsx";

interface PCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function PCQForm({ previewChoices }: Readonly<PCQFormProps>) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices?.[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const options: any = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage] && previewChoices?.[selectedLanguage]?.length > 0
      ? previewChoices?.[selectedLanguage]
      : samplePictureChoices;
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const publicRoute = pathname.startsWith("/public") || pathname.startsWith("/ws");

  const isSurveyThemePreview = useIsSurveyThemePreview();

  useEffect(() => {
    if (response) {
      const val = response.value?.value ?? response.value;
      setSelectedOp(typeof val === "string" ? val : "");
    }
  }, [response]);

  const handleSelectedOp = async (value: string) => {
    const res = options?.find(
      (op: Choice) => ((op?.value as { value?: string })?.value ?? op?.value) === value,
    );
    updateResponse(res);
    const selectedEle = scope.current?.querySelector(`[data-value="${value}"]`);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedEle) {
        await animate(selectedEle, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
      }
      nextFn?.(res);
    }
  };
  const fallbackEnable =
    publicRoute || isSurveyThemePreview
      ? false
      : !(previewChoices?.[selectedLanguage] && previewChoices?.[selectedLanguage]?.length > 0);
  const data = options?.map((op: Choice) => op?.value);

  return (
    <div ref={scope} className="mr-2 w-full">
      <SingleSelectCard
        data={data}
        selectedValue={selectedOp}
        includeImage
        fallbackEnable={fallbackEnable}
        onChange={handleSelectedOp}
      />
    </div>
  );
}
