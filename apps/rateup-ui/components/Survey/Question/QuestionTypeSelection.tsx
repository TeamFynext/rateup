import { Button, Center, SimpleGrid } from "@mantine/core";
import { Text } from "@mantine/core";
import {
  IconLetterCase,
  IconMail,
  IconPhone,
  IconStar,
  IconMoodSmile,
  IconCalendar,
  IconCamera,
  IconUser,
  Icon123,
  IconAlignBoxLeftTop,
  IconCheckupList,
  IconListCheck,
  IconHandClick,
  IconThumbUp,
  IconSortAscendingNumbers,
  IconSelect,
  IconSelector,
  IconList,
  IconCircuitPushbutton,
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";
import { QuestionTabsEnum } from "../EditSurvey";

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
              styles={{ inner: { justifyContent: "flex-start" } }}
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
  [QuestionType.Text]: IconLetterCase,
  [QuestionType.TextArea]: IconAlignBoxLeftTop,
  [QuestionType.Number]: Icon123,
  [QuestionType.Email]: IconMail,
  [QuestionType.Phone]: IconPhone,
  [QuestionType.Photo]: IconCamera,
  [QuestionType.DateTime]: IconCalendar,
  [QuestionType.LD]: IconThumbUp,
  [QuestionType.YN]: IconHandClick,
  [QuestionType.Rating]: IconStar,
  [QuestionType.Smiley]: IconMoodSmile,
  [QuestionType.Opinion]: IconSortAscendingNumbers,
  [QuestionType.MCQ]: IconCheckupList,
  [QuestionType.MSQ]: IconListCheck,
  [QuestionType.Testimonial]: IconUser,
  [QuestionType.DDSS]: IconSelect,
  [QuestionType.DDMS]: IconSelector,
  [QuestionType.WaList]: IconList,
  [QuestionType.WaButtons]: IconCircuitPushbutton,
};
