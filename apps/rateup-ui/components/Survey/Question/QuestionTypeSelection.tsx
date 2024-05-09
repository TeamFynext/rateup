import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { IconScaleOutline, IconTextPlus } from "@tabler/icons-react";
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
  IconLink,
  IconList,
  IconListCheck,
  IconListDetails,
  IconMailFilled,
  IconMapPin,
  IconMessageChatbot,
  IconMoodSmileFilled,
  IconPhoneFilled,
  IconPhoto,
  IconStarsFilled,
  IconTextSize,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  QuestionType,
  WaFlowFormNonInputElementType,
} from "../../../types/enums";
import { googleReviewSupportedTypes } from "../../../utils/data";
import { getQuestionTypeLabel } from "../../../utils/enums";
import { GoogleIcon } from "../../Button/GoogleIcon";

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
      <Flex justify={"flex-end"} py="sm">
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
      <Stack
        gap={"md"}
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {questionTypeGroups?.map((qtype, i) => {
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
  [QuestionType.Address]: IconMapPin,
  [QuestionType.MultiTextInput]: IconTextPlus,
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
  [WaFlowFormNonInputElementType.nonInputText]: IconTextSize,
  [WaFlowFormNonInputElementType.image]: IconPhoto,
  [WaFlowFormNonInputElementType.embeddedLink]: IconLink,
  [WaFlowFormNonInputElementType.optIn]: IconLink,
};

export { questionIcons };
