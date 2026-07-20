import { AnimatePresence, motion } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Field } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";

import { MultipleSelectCard } from "../SelectionCard/MultipleSelectCard.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

interface MSQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
  features?: Record<string, any>;
}

interface MSQFormValues {
  selectedOptions: string[];
  otherText: string;
}

export function MSQForm({ previewChoices, features }: Readonly<MSQFormProps>) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];

  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;
  const selectedFeature = features?.[selectedLanguage];
  const otherInputContainerRef = useRef(null);
  const bDivRef = useRef(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [isOtherInputFocusTrapActive, setIsOtherInputFocusTrapActive] = useState(false);

  const data = options?.map((op) => op?.value);
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { control, watch, setValue } = useForm<MSQFormValues>({
    defaultValues: {
      selectedOptions: [],
      otherText: response?.find((r) => r?.other)?.other || "",
    },
  });
  const selectedOp = watch("selectedOptions");
  const otherInput = watch("otherText");

  useEffect(() => {
    if (response) {
      setValue(
        "selectedOptions",
        response?.map((r) => (r?.other ? selectedFeature?.other.title : r?.value)),
      );
    }
  }, [response]);

  const handleSelectedOp = (values: string[]) => {
    setValue("selectedOptions", values);
    const res = values?.map((val) => options?.find((op) => op?.value === val));
    if (values.includes(selectedFeature?.other?.title)) {
      if (otherInput?.length) updateResponse([...res, { other: otherInput }]);
      else updateResponse(null);
    } else {
      updateResponse(res);
      setValue("otherText", "");
    }
  };

  useEffect(() => {
    if (selectedOp.includes(selectedFeature?.other?.title) && otherInputContainerRef.current) {
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
    data.filter((op) => op !== selectedFeature?.other?.title);
  }

  return (
    <div className="flex w-full flex-col overflow-hidden mr-3">
      <MultipleSelectCard
        data={data}
        checkBoxEnable
        selectedValue={selectedOp}
        onChange={handleSelectedOp}
      />
      <AnimatePresence initial={false}>
        {selectedFeature?.other?.isEnabled &&
          selectedOp.includes(selectedFeature?.other?.title) && (
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
                if (otherInputContainerRef.current && defObj["x"] === 0) {
                  setIsOtherInputFocusTrapActive(true);
                }
              }}
            >
              <FormPaperLayout>
                <Controller
                  name="otherText"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <Input
                        {...field}
                        ref={otherInputRef}
                        placeholder={selectedFeature?.other?.placeholder}
                        className="border-none bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0"
                        onChange={(e) => {
                          field.onChange(e);
                          const res = options?.filter((op) => selectedOp?.includes(op?.value));
                          updateResponse([...res, { other: e.target.value }]);
                        }}
                      />
                    </Field>
                  )}
                />
              </FormPaperLayout>
            </motion.div>
          )}
      </AnimatePresence>

      {/* using this div to scroll to bottom, If we use motion.div to scrollIntoView animation will not work properly. */}
      <div ref={bDivRef}></div>
    </div>
  );
}
