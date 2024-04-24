import { useContext, useEffect, useRef, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Box,
  FocusTrap,
  Input,
  Radio,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { sampleChoices } from "../../../../../utils/constants/forms";
import { SingleSelectCard } from "../SelectionCard/SingleSelectCard";
import classes from "../TakeSurvey.module.css";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";

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
  const [isOtherInputFocusTrapActive, setIsOtherInputFocusTrapActive] =
    useState(false);
  const router = useRouter();
  const theme = useMantineTheme();
  const otherInputContainerRef = useRef(null);
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const bDivRef = useRef(null);
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
      if (!isLastQuestion) nextFn?.();
    } else {
      updateResponse(null);
    }
  };

  useEffect(() => {
    if (
      selectedOp === selectedFeature?.other?.title &&
      otherInputContainerRef.current
    ) {
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
    <Stack w={"100%"} mr="sm" py={"xs"} style={{ overflow: "hidden" }}>
      <Radio.Group value={selectedOp} onChange={handleSelectedOp}>
        <SingleSelectCard data={data} selectedValue={selectedOp} />
      </Radio.Group>
      <AnimatePresence initial={false}>
        {selectedFeature?.other?.isEnabled &&
          selectedOp === selectedFeature?.other?.title && (
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
              </Box>
            </motion.div>
          )}
      </AnimatePresence>

      {/* using this div to scroll to bottom, If we use motion.div to scrollIntoView animation will not work properly. */}
      <div ref={bDivRef}></div>
    </Stack>
  );
}
