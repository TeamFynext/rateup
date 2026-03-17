"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Flex,
  Grid,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  Icon123,
  IconAddressBook,
  IconAdjustmentsQuestion,
  IconAlignBoxLeftMiddleFilled,
  IconCalendarTime,
  IconCameraFilled,
  IconCaretDownFilled,
  IconCaretUpDown,
  IconCheckbox,
  IconCircuitPushbutton,
  IconClick,
  IconFileFilled,
  IconGridDots,
  IconLink,
  IconList,
  IconListCheck,
  IconListDetails,
  IconMailFilled,
  IconMessageChatbot,
  IconMoodSmileFilled,
  IconPhoneFilled,
  IconPhoto,
  IconScaleOutline,
  IconSquareAsterisk,
  IconStarsFilled,
  IconTextPlus,
  IconTextSize,
  IconThumbUpFilled,
  IconWheel,
} from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import {
  QuestionType,
  WaFlowFormNonInputElementType,
} from "../../../types/enums";
import { googleReviewSupportedTypes } from "../../../utils/data";
import { getQuestionTypeLabel } from "../../../utils/enums";
import { GoogleIcon } from "../../Button/GoogleIcon";
import classes from "./QuestionDetailedView.module.css";

interface QuestionTypeSelectionProps {
  questionTypeGroups: Array<{
    title: string;
    questionTypes: Array<any>;
  }>;
  handleTypeSelection: (type: QuestionType) => void;
}
export function QuestionTypeSelection({
  questionTypeGroups,
  handleTypeSelection,
}: QuestionTypeSelectionProps) {
  const [IsGoogleReviewSupported, setIsGoogleReviewSupported] = useState(false);

  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
    setIsGoogleReviewSupported(false);
  };
  const translations = useExtracted();
  const QuestionButton = ({ type }) => {
    const { hovered, ref } = useHover();
    const Icon = questionIcons[type];
    return (
      <div ref={ref}>
        <Button
          key={type}
          size="lg"
          leftSection={<Icon size={"1rem"} />}
          variant={"default"}
          className={classes.questionTypeButton}
          p={15}
          onClick={() => handleQuestionTypeClick(type as QuestionType)}
          onMouseOver={() => {
            if (googleReviewSupportedTypes.includes(type))
              setIsGoogleReviewSupported(true);
            else setIsGoogleReviewSupported(false);
          }}
          onMouseLeave={() => {
            setIsGoogleReviewSupported(false);
          }}
        >
          <Text fz={14}>{getQuestionTypeLabel(type)}</Text>
        </Button>
      </div>
    );
  };
  return (
    <Flex direction={"column"} h={"100%"}>
      <Stack gap={"md"}>
        {questionTypeGroups?.map((qtype, i) => {
          return (
            <Stack gap={"sm"} key={i}>
              <Group justify="space-between">
                <Title order={4} c="dimmed">
                  {qtype?.title}
                </Title>
                {IsGoogleReviewSupported && i == 0 ? (
                  <Badge
                    leftSection={<GoogleIcon width={"1rem"} height={"1rem"} />}
                    radius={"md"}
                    color="var(--bg-grey-color)"
                    c="grey"
                    size={"lg"}
                    styles={{
                      label: {
                        textTransform: "capitalize",
                      },
                    }}
                  >
                    {translations("Review Supported")}
                  </Badge>
                ) : null}
              </Group>
              <Grid px={"lg"}>
                {qtype?.questionTypes?.map((type, index) => {
                  return (
                    <Grid.Col span="content" key={index} p={"sm"}>
                      <QuestionButton type={type} />
                    </Grid.Col>
                  );
                })}
              </Grid>
            </Stack>
          );
        })}
      </Stack>
    </Flex>
  );
}

// TODO: add proper icons
const questionIcons = {
  [QuestionType.Text]: IconTextSize,
  [QuestionType.TextArea]: IconAlignBoxLeftMiddleFilled,
  [QuestionType.Number]: Icon123,
  [QuestionType.Email]: IconMailFilled,
  [QuestionType.Phone]: IconPhoneFilled,
  [QuestionType.Photo]: IconCameraFilled,
  [QuestionType.Date]: IconCalendarTime,
  [QuestionType.LD]: IconThumbUpFilled,
  [QuestionType.YN]: IconClick,
  [QuestionType.Rating]: IconStarsFilled,
  [QuestionType.Smiley]: IconMoodSmileFilled,
  [QuestionType.Opinion]: IconScaleOutline,
  [QuestionType.MCQ]: IconListCheck,
  [QuestionType.MSQ]: IconListDetails,
  [QuestionType.Testimonial]: IconMessageChatbot,
  [QuestionType.EmailPhone]: IconAddressBook,
  [QuestionType.DDSS]: IconCaretDownFilled,
  [QuestionType.DDMS]: IconCaretUpDown,
  [QuestionType.CustomNPS]: IconAdjustmentsQuestion,
  [QuestionType.PCQ]: IconAdjustmentsQuestion,
  [QuestionType.Contact]: IconAddressBook,
  [QuestionType.TnC]: IconCheckbox,
  [QuestionType.InfoMessage]: IconMailFilled,
  [QuestionType.MultiTextInput]: IconTextPlus,
  [QuestionType.MCQGrid]: IconGridDots,
  [QuestionType.File]: IconFileFilled,
  [QuestionType.EmailOtp]: IconSquareAsterisk,
  [QuestionType.WOP]: IconWheel,
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
  [QuestionType.WaTimeSlot]: IconCalendarTime,
  [QuestionType.PhotoPicker]: IconCameraFilled,
  [QuestionType.DocumentPicker]: IconFileFilled,
  [WaFlowFormNonInputElementType.nonInputText]: IconTextSize,
  [WaFlowFormNonInputElementType.image]: IconPhoto,
  [WaFlowFormNonInputElementType.embeddedLink]: IconLink,
  [WaFlowFormNonInputElementType.optIn]: IconLink,
};

export { questionIcons };
