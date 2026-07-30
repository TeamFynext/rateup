import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { sampleChoices } from "@/utils/constants/forms.ts";

import { SingleSelectCard } from "../SelectionCard/SingleSelectCard.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

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
  const [isOtherInputFocusTrapActive, setIsOtherInputFocusTrapActive] = useState(false);

  const themePrimaryColor = useThemePrimaryColor();
  const otherInputContainerRef = useRef(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const bDivRef = useRef(null);
  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;

  const data = options?.map((op: Choice) => op?.value);

  useEffect(() => {
    if (response) {
      if (response?.value) {
        if (selectedOp !== response?.value) setSelectedOp(response.value);
      } else if (response?.other) {
        setSelectedOp(selectedFeature?.other?.title);
      }
    }
  }, [response]);

  const handleSelectedOp = async (value: string) => {
    setSelectedOp(value);
    if (value !== selectedFeature?.other?.title) {
      const res = options?.find((op: Choice) => op?.value === value);
      updateResponse(res);
      const selectedEle = scope.current?.querySelector(`[data-value="${value}"]`);
      if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
        if (selectedEle) {
          await animate(selectedEle, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
        }
        nextFn?.(res);
      }
    } else {
      updateResponse(null);
    }
  };

  useEffect(() => {
    if (selectedOp === selectedFeature?.other?.title && otherInputContainerRef.current) {
      bDivRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (isOtherInputFocusTrapActive) {
      setIsOtherInputFocusTrapActive(false);
    }
  }, [selectedOp]);

  useEffect(() => {
    if (isOtherInputFocusTrapActive) {
      otherInputRef.current?.focus();
    }
  }, [isOtherInputFocusTrapActive]);

  if (selectedFeature?.other?.isEnabled) {
    data.push(selectedFeature?.other?.title);
  } else {
    data?.filter((op: unknown) => op !== selectedFeature?.other?.title);
  }

  return (
    <div className="mr-3 flex w-full flex-col gap-4 overflow-hidden">
      <div ref={scope}>
        <SingleSelectCard data={data} selectedValue={selectedOp} onChange={handleSelectedOp} />
      </div>
      <AnimatePresence initial={false}>
        {selectedFeature?.other?.isEnabled && selectedOp === selectedFeature?.other?.title && (
          <motion.div
            transition={{
              type: "tween",
              duration: 0.5,
              delay: 0.25,
            }}
            initial={{ x: "100vw" }}
            animate={{ x: 0 }}
            exit={{ x: "-100vw" }}
            key={"other-option-input"}
            ref={otherInputContainerRef}
            onAnimationComplete={(defObj) => {
              // The definition is this element's own target object, `{ x: … }`.
              if (
                otherInputContainerRef.current &&
                typeof defObj === "object" &&
                "x" in defObj &&
                defObj.x === 0
              ) {
                setIsOtherInputFocusTrapActive(true);
              }
            }}
          >
            <div
              className="w-full max-w-[500px] rounded-[var(--input-border-radius,8px)] border bg-[var(--input-background-color,white)] px-[var(--input-padding,12px)] py-1.5 text-[var(--input-text-color,black)] shadow-sm transition-colors duration-100"
              style={{ borderColor: themePrimaryColor }}
            >
              <Input
                ref={otherInputRef}
                placeholder={selectedFeature?.other?.placeholder}
                value={response?.other || ""}
                onChange={(e) =>
                  !e.target.value?.length
                    ? updateResponse(null)
                    : updateResponse({ other: e.target.value })
                }
                className="h-auto w-full border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* using this div to scroll to bottom, If we use motion.div to scrollIntoView animation will not work properly. */}
      <div ref={bDivRef}></div>
    </div>
  );
}
