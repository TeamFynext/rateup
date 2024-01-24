import { useContext, useEffect, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Image,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { samplePictureChoices } from "../../../../../utils/constants/forms";
import { getImageValue } from "../../../../../utils/file-upload/upload";
import { useRouter } from "next/router";
import { useMediaQuery } from "@mantine/hooks";

interface MCQFormProps {
  previewChoices?: Record<string, Array<Choice>>;
}

export function PCQForm({ previewChoices }: MCQFormProps) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ?.choices[selectedLanguage];
  const [selectedOp, setSelectedOp] = useState("");
  const router = useRouter();
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const largeScreen = useMediaQuery("(min-width: 40em)");

  const options: any = selectedQ
    ? choices
    : previewChoices?.[selectedLanguage] &&
      previewChoices?.[selectedLanguage]?.length > 0
    ? previewChoices?.[selectedLanguage]
    : samplePictureChoices;
  const publicRoute = router.pathname.startsWith("/public");

  useEffect(() => {
    if (response) {
      setSelectedOp(publicRoute ? response.value.value : response.value);
    }
  }, [response]);

  const handleSelectedOp = (value) => {
    const res = options?.find(
      (op) => (publicRoute ? op?.value?.value : op?.value) === value,
    );
    updateResponse(res);
  };
  const fallbackEnable = publicRoute
    ? false
    : !(
        previewChoices?.[selectedLanguage] &&
        previewChoices?.[selectedLanguage]?.length > 0
      );
  const designedData = options?.map(({ value: { value: label, image } }) => ({
    value: label,
    label: (
      <>
        <Image
          src={getImageValue(image, fallbackEnable)}
          style={{ aspectRatio: 4 / 3 }}
        />
        <Tooltip label={label}>
          <Text
            style={{ wordWrap: "break-word", whiteSpace: "normal" }}
            lineClamp={2}
          >
            {label}
          </Text>
        </Tooltip>
      </>
    ),
  }));
  const publicRouteHeight = publicRoute ? "100vw" : "45vw";
  return (
    <Stack
      maw={largeScreen ? publicRouteHeight : "100%"}
      miw={!largeScreen && "100%"}
      align={!largeScreen && "center"}
    >
      <ScrollArea h={"40vh"} p={0} m={0}>
        <SegmentedControl
          data={designedData}
          value={selectedOp}
          onChange={handleSelectedOp}
          color="var(--tertiary-color)"
          size="md"
          classNames={{
            label: classes.sgPcqlabel,
            indicator: classes.sgIndicator,
            root: classes.sgRoot,
            control: classes.sgControl,
          }}
          className={classes["sgGrid"]}
        />
      </ScrollArea>
    </Stack>
  );
}
