import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Grid,
  ScrollArea,
  Stack,
  Title,
} from "@mantine/core";
import { Text } from "@mantine/core";
import {
  Icon123,
  IconListCheck,
  IconList,
  IconCircuitPushbutton,
  IconTextSize,
  IconAlignBoxLeftMiddleFilled,
  IconMailFilled,
  IconCameraFilled,
  IconCalendarTime,
  IconThumbUpFilled,
  IconClick,
  IconStarsFilled,
  IconMoodSmileFilled,
  IconMessageChatbot,
  IconListDetails,
  IconCaretDownFilled,
  IconCaretUpDown,
  IconAdjustmentsQuestion,
  IconAddressBook,
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";
import { QuestionTabsEnum } from "../EditSurvey";
import { IconPhoneFilled } from "@tabler/icons-react";
import { IconScaleOutline } from "@tabler/icons";
import {
  QuestionTypesGroup,
  WaSurveyQuestionTypes,
} from "../../../utils/constants";
import { useHover } from "@mantine/hooks";
import { GoogleIcon } from "../../Button/GoogleIcon";
import { googleReviewSupportedTypes } from "../../../utils/data";
import { getQuestionTypeLabel } from "../../../utils/enums";
import { useRouter } from "next/router";
import { useQuestionCreateMutation } from "../../../backend/surveys/questions/questions.query";

interface QuestionTypeSelectionProps {
  setSelectedQ: (q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  isWaSurvey?: boolean;
}
export function QuestionTypeSelection({
  setSelectedQ,
  setActiveTab,
  isWaSurvey,
}: QuestionTypeSelectionProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const [isSaving, setIsSaving] = useState(false);
  const questionCreateMutation = useQuestionCreateMutation({
    surveyId,
    setIsSaving,
  });
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, selectedLanguage);
    const { id, ...restData } = newQ;
    const saveQ = { ...restData };
    questionCreateMutation.mutateAsync(saveQ).then((r) => {
      setSelectedQ(r.data);
      setActiveTab(QuestionTabsEnum.Edit);
      setIsGoogleReviewSupported(false);
    });
  };
  const filteredQuestionTypes = isWaSurvey
    ? WaSurveyQuestionTypes
    : QuestionTypesGroup;

  const [IsGoogleReviewSupported, setIsGoogleReviewSupported] = useState(false);
  const QuestionButton = ({ type }) => {
    const { hovered, ref } = useHover();
    const Icon = questionIcons[type];
    return (
      <div ref={ref}>
        <Button
          key={type}
          size="lg"
          leftSection={<Icon size={"1rem"} />}
          variant={hovered ? "outline" : "default"}
          styles={{
            root: {
              boxShadow: hovered ? "3px 3px 10px rgba(0, 0, 0, 0.1)" : "none",
            },
          }}
          p={15}
          onClick={() => handleTypeSelection(type as QuestionType)}
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
    <ScrollArea>
      <Flex justify={"flex-end"}>
        {IsGoogleReviewSupported ? (
          <Badge
            leftSection={<GoogleIcon width={"1.3rem"} height={"1.3rem"} />}
            radius={"md"}
            color="var(--bg-grey-color)"
            c="grey"
            size={"xl"}
            styles={{
              label: {
                textTransform: "capitalize",
              },
            }}
          >
            Review Supported
          </Badge>
        ) : (
          <Box h={"xl"}></Box>
        )}
      </Flex>
      <Center style={{ height: "100%" }}>
        <Stack gap={"md"}>
          {filteredQuestionTypes?.map((qtype, i) => {
            return (
              <Stack gap={"sm"} key={i}>
                <Title order={4} c="dimmed">
                  {qtype?.title}
                </Title>
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
      </Center>
    </ScrollArea>
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
  [QuestionType.DateTime]: IconCalendarTime,
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
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
};
