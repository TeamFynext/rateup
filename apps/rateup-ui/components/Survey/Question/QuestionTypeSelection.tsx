import { Button, Center, SimpleGrid } from "@mantine/core";
import { Text } from '@mantine/core';
import { IconLetterCase, IconMail, IconPhone, IconStar, IconMoodSmile, IconCalendar, IconFileLike, IconCamera, IconUser } from "@tabler/icons-react";
import { QuestionType } from "../../../types/enums";

export function QuestionTypeSelection() {
  return (
    <Center sx={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {Object.entries(questionIcons).map(([key, Icon]) => (
          <Button key={key} leftIcon={<Icon />} variant="default">
            <Text>{key}</Text>
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