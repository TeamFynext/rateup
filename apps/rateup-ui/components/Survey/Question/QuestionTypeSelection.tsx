import { Button, Center, SimpleGrid } from "@mantine/core";
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
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";
import { QuestionTabsEnum } from "../EditSurvey";
import { IconPhoneFilled } from "@tabler/icons-react";
import { IconScaleOutline } from "@tabler/icons";

interface QuestionTypeSelectionProps {
  setSelectedQ: (q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  types: QuestionType[];
}
export function QuestionTypeSelection({
  setSelectedQ,
  setActiveTab,
  types,
}: QuestionTypeSelectionProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, selectedLanguage);
    setSelectedQ(newQ);
    setActiveTab(QuestionTabsEnum.Edit);
  };

  return (
    <Center style={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {types.map((type) => {
          const Icon = questionIcons[type];
          return (
            <Button
              key={type}
              leftSection={<Icon />}
              variant="default"
              styles={{
                inner: { justifyContent: "flex-start" },
                root: { boxShadow: "3px 3px 10px rgba(0, 0, 0, 0.1)" },
              }}
              onClick={() => handleTypeSelection(type as QuestionType)}
            >
              <Text>{type}</Text>
            </Button>
          );
        })}
      </SimpleGrid>
    </Center>
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
  [QuestionType.DDSS]: IconCaretDownFilled,
  [QuestionType.DDMS]: IconCaretUpDown,
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
};
