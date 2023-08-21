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
} from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { createBlankQuestion } from "../../../utils/questions";
import { QuestionTabsEnum } from "../EditSurvey";

interface QuestionTypeSelectionProps {
  setSelectedQ: (q: Question) => void;
  setActiveTab: (tab: QuestionTabsEnum) => void;
  surveyType
}
export function QuestionTypeSelection({
  setSelectedQ,
  setActiveTab,
  surveyType
}: QuestionTypeSelectionProps) {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const handleTypeSelection = (type: QuestionType) => {
    const newQ = createBlankQuestion(type, selectedLanguage);
    setSelectedQ(newQ);
    setActiveTab(QuestionTabsEnum.Edit);
  };

  //console.log(typeof(surveyType) ,">>surveyty")
  return (
    <Center sx={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {surveyType==="web"? Object.entries(questionIcons).map(([type, Icon]) => (
          <Button
            key={type}
            leftIcon={<Icon />}
            variant="default"
            onClick={() => handleTypeSelection(type as QuestionType)}
          >
            <Text>{type}</Text>
          </Button>
        )):Object.entries(whatsappQuestionIcons).map(([type, Icon]) => (
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
  [QuestionType.TextArea]: IconAlignBoxLeftTop, //TODO update icon
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

};
const whatsappQuestionIcons = {
  [QuestionType.Text]: IconLetterCase,
  [QuestionType.TextArea]: IconAlignBoxLeftTop, //TODO update icon
  [QuestionType.Number]: Icon123,
  [QuestionType.Email]: IconMail,
  [QuestionType.Phone]: IconPhone,
  [QuestionType.Photo]: IconCamera,
  // [QuestionType.Rating]: IconStar,
  [QuestionType.MCQ]: IconCheckupList,
  // [QuestionType.MSQ]: IconStar,
  // [QuestionType.Smiley]: IconMoodSmile,
  // [QuestionType.Opinion]: IconStar,
  // [QuestionType.DateTime]: IconCalendar,
  [QuestionType.LD]: IconThumbUp,
  [QuestionType.YN]: IconHandClick,
  // [QuestionType.Testimonial]: IconUser,
};

console.assert(
  Object.values(QuestionType).every((key) => questionIcons[key] !== undefined),
  "Not all QuestionType enums are mapped to an icon"
);
