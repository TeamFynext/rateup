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
import {
  IconAlignBoxLeftMiddleFilled,
  IconCalendarTime,
  IconCameraFilled,
  IconCaretDownFilled,
  IconClick,
  IconFileFilled,
  IconImageInPicture,
  IconLink,
  IconListCheck,
  IconListDetails,
  IconMailFilled,
  IconMoodSmileFilled,
  IconPhoneFilled,
  IconPhoto,
  IconPokerChip,
  IconScaleOutline,
  IconStarsFilled,
  IconTextSize,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { QuestionType, QuestionType2 } from "../../../types/enums";
import { googleReviewSupportedTypes } from "../../../utils/data";
import { GoogleIcon } from "../../Button/GoogleIcon";
import classes from "./EditFlow.module.css";

interface QuestionTypeSelectionProps {
  questionTypeGroups: Array<{
    title: string;
    questionTypes: Array<any>;
  }>;
  handleTypeSelection: (type: QuestionType2) => void;
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
  const translations = useTranslations();
  const QuestionButton = ({ type }) => {
    const Icon = questionIcons[type];
    return (
      <div>
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
          <Text fz={14}>{type}</Text>
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
  [QuestionType2.TextInput]: IconTextSize,
  [QuestionType2.TextArea]: IconAlignBoxLeftMiddleFilled,
  [QuestionType2.DatePicker]: IconCalendarTime,
  [QuestionType2.LD]: IconThumbUpFilled,
  [QuestionType2.YN]: IconClick,
  [QuestionType2.Rating]: IconStarsFilled,
  [QuestionType2.Smiley]: IconMoodSmileFilled,
  [QuestionType2.Opinion]: IconScaleOutline,
  [QuestionType2.RadioButtonsGroup]: IconListCheck,
  [QuestionType2.CheckboxGroup]: IconListDetails,
  [QuestionType2.Dropdown]: IconCaretDownFilled,
  // [QuestionType2.WaTimeSlot]: IconCalendarTime,
  [QuestionType2.PhotoPicker]: IconCameraFilled,
  [QuestionType2.DocumentPicker]: IconFileFilled,
  [QuestionType2.TextHeading]: IconTextSize,
  [QuestionType2.TextSubheading]: IconTextSize,
  [QuestionType2.TextBody]: IconTextSize,
  [QuestionType2.TextCaption]: IconTextSize,

  [QuestionType2.Image]: IconPhoto,
  [QuestionType2.EmbeddedLink]: IconLink,
  [QuestionType2.OptIn]: IconLink,
  [QuestionType2.RichText]: IconLink,
  [QuestionType2.ChipsSelector]: IconPokerChip,
  [QuestionType2.ImageCarousel]: IconImageInPicture,
};

export { questionIcons };
