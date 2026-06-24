import { Box, Checkbox, FocusTrap, Input, Stack, useMantineTheme } from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { sampleChoices } from "@/utils/constants/forms.ts";

import { MultipleSelectCard } from "../SelectionCard/MultipleSelectCard.tsx";

import classes from "../TakeSurvey.module.css";

interface MSQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
  features?: Record<string, any>;
}

export function MSQForm({ previewChoices, features }: Readonly<MSQFormProps>) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState([]);
  const theme = useMantineTheme();

  const options = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage]
      ? previewChoices?.[selectedLanguage]
      : sampleChoices;
  const selectedFeature = features?.[selectedLanguage];
  const otherInputContainerRef = useRef(null);
  const bDivRef = useRef(null);
  const [isOtherInputFocusTrapActive, setIsOtherInputFocusTrapActive] = useState(false);

  const data = options?.map((op) => op?.value);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [otherInput, setOtherInput] = useState(response?.find((r) => r?.other)?.other || "");

  useEffect(() => {
    if (response) {
      setSelectedOp(response?.map((r) => (r?.other ? selectedFeature?.other.title : r?.value)));
    }
  }, [response]);

  const handleSelectedOp = (values: string[]) => {
    setSelectedOp(values);
    const res = values?.map((val) => options?.find((op) => op?.value === val));
    if (values.includes(selectedFeature?.other?.title)) {
      if (otherInput?.length) updateResponse([...res, { other: otherInput }]);
      else updateResponse(null);
    } else {
      updateResponse(res);
      setOtherInput("");
    }
  };

  useEffect(() => {
    if (selectedOp.includes(selectedFeature?.other?.title) && otherInputContainerRef.current) {
      bDivRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (isOtherInputFocusTrapActive) {
      setIsOtherInputFocusTrapActive(false);
    }
  }, [selectedOp]);

  if (selectedFeature?.other?.isEnabled) {
    data.push(selectedFeature?.other?.title);
  } else {
    data.filter((op) => op !== selectedFeature?.other?.title);
  }

  return (
    <Stack w={"100%"} mr="sm" style={{ overflow: "hidden" }}>
      <Checkbox.Group value={selectedOp} onChange={handleSelectedOp} mr={"sm"} w={"100%"}>
        <MultipleSelectCard data={data} checkBoxEnable selectedValue={selectedOp} />
      </Checkbox.Group>
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
              <Box
                className={classes.inputBox}
                style={{
                  borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
                  boxShadow: `0 0 4px 4px rgba(0, 0, 0, 0.05rgba(0, 0, 0, 0.05) 0px 1px 0px,
                 rgba(0, 0, 0, 0.11) 0px 0px 8px)`,
                }}
              >
                <FocusTrap active={isOtherInputFocusTrapActive}>
                  <Input
                    placeholder={selectedFeature?.other?.placeholder}
                    value={otherInput || ""}
                    onChange={(e) => {
                      setOtherInput(e.currentTarget.value);
                      const res = options?.filter((op) => selectedOp?.includes(op?.value));
                      updateResponse([...res, { other: e.currentTarget.value }]);
                    }}
                    variant="unstyled"
                    classNames={{
                      input: classes.input,
                    }}
                    data-autofocus
                  />
                </FocusTrap>
              </Box>
            </motion.div>
          )}
      </AnimatePresence>

      {/* using this div to scroll to bottom, If we use motion.div to scrollIntoView animation will not work properly. */}
      <div ref={bDivRef}></div>
    </Stack>
  );
}
