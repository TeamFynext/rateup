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
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";
import { QuestionTabsEnum } from "../EditSurvey";

interface QuestionTypeSelectionProps {
  setSelectedQ: (q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
}
export function QuestionTypeSelection({
  setSelectedQ,
  setActiveTab,
}: QuestionTypeSelectionProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, selectedLanguage);
    setSelectedQ(newQ);
    setActiveTab(QuestionTabsEnum.Edit);
  };
  return (
    <Center sx={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {Object.entries(questionIcons).map(([type, Icon]) => (
          <Button
            key={type}
            leftIcon={<Icon />}
            variant="default"
            onClick={() => handleTypeSelection(type as QuestionType)}
          >
            <Text>{type}</Text>
          </Button>
        ))}
      </SimpleGrid>
    </Center>
  );
}

// TODO: add proper icons
const questionIcons = {
  [QuestionType.Text]: IconLetterCase,
  [QuestionType.Email]: IconMail,
  [QuestionType.Phone]: IconPhone,
  [QuestionType.Rating]: IconStar,
  [QuestionType.MCQ]: IconStar,
  [QuestionType.MSQ]: IconStar,
  [QuestionType.Smiley]: IconMoodSmile,
  [QuestionType.Opinion]: IconStar,
  [QuestionType.DateTime]: IconCalendar,
  [QuestionType.LD]: IconStar,
  [QuestionType.YN]: IconStar,
  [QuestionType.Photo]: IconCamera,
  [QuestionType.Testimonial]: IconUser,
};

console.assert(
  Object.values(QuestionType).every((key) => questionIcons[key] !== undefined),
  "Not all QuestionType enums are mapped to an icon"
);
