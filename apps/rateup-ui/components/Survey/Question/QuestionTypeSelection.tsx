import { Button, Center, SimpleGrid } from "@mantine/core";
import { Text } from '@mantine/core';
import { IconLetterCase, IconMail, IconPhone, IconStar, IconMoodSmile, IconCalendar, IconFileLike, IconCamera, IconUser } from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";

interface QuestionTypeSelectionProps {
  setSelectedQ: (q: Question) => void;
}
export function QuestionTypeSelection({ setSelectedQ }) {

  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, selectedLanguage);
    setSelectedQ(newQ);
  }
  return (
    <Center sx={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {Object.entries(questionIcons).map(([type, Icon]) => (
          <Button key={type} leftIcon={<Icon />} variant="default" onClick={() => handleTypeSelection(type as QuestionType)}>
            <Text>{type}</Text>
          </Button>
        ))}
      </SimpleGrid>
    </Center>
  );
}


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
}

console.assert(Object.values(QuestionType).every(key => questionIcons[key] !== undefined), 'Not all QuestionType enums are mapped to an icon')