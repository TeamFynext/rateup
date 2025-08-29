"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Radio } from "@mantine/core";
import { useAnimate } from "motion/react";

import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import { useSurveyContext } from "../../../../../context/SurveyObjContext";
import { samplePictureChoices } from "../../../../../utils/constants/forms";
import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";

interface PCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function PCQForm({ previewChoices }: Readonly<PCQFormProps>) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices?.[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const router = useRouter();
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const options: any = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage] &&
        previewChoices?.[selectedLanguage]?.length > 0
      ? previewChoices?.[selectedLanguage]
      : samplePictureChoices;
  const pathname = usePathname();

  const publicRoute =
    pathname.startsWith("/public") || pathname.startsWith("/ws");

  const isSurveyThemePreview = useIsSurveyThemePreview();

  useEffect(() => {
    if (response) {
      setSelectedOp(
        publicRoute || isSurveyThemePreview
          ? response.value.value
          : response.value,
      );
    }
  }, [response]);

  const handleSelectedOp = async (value) => {
    const res = options?.find(
      (op) =>
        (publicRoute || isSurveyThemePreview ? op?.value?.value : op?.value) ===
        value,
    );
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
  const fallbackEnable =
    publicRoute || isSurveyThemePreview
      ? false
      : !(
          previewChoices?.[selectedLanguage] &&
          previewChoices?.[selectedLanguage]?.length > 0
        );
  const data = options?.map((op) => op?.value);

  return (
    <Radio.Group
      value={selectedOp}
      onChange={handleSelectedOp}
      mr={"sm"}
      w={"100%"}
      ref={scope}
    >
      <SingleSelectCard
        data={data}
        selectedValue={selectedOp}
        includeImage
        fallbackEnable={fallbackEnable}
      />
    </Radio.Group>
  );
}
