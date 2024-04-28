import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Radio } from "@mantine/core";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { samplePictureChoices } from "../../../../../utils/constants/forms";
import { useRouter } from "next/router";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useAnimate } from "framer-motion";

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

  const options: any = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage] &&
        previewChoices?.[selectedLanguage]?.length > 0
      ? previewChoices?.[selectedLanguage]
      : samplePictureChoices;
  const publicRoute =
    router.pathname.startsWith("/public") || router.pathname.startsWith("/ws");

  useEffect(() => {
    if (response) {
      setSelectedOp(publicRoute ? response.value.value : response.value);
    }
  }, [response]);

  const handleSelectedOp = async (value) => {
    const res = options?.find(
      (op) => (publicRoute ? op?.value?.value : op?.value) === value,
    );
    updateResponse(res);
    const selectedEle = scope.current?.querySelector(
      `.mantine-focus-auto[data-value="${value}"]`,
    );
    if (!isLastQuestion) {
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
  const fallbackEnable = publicRoute
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
