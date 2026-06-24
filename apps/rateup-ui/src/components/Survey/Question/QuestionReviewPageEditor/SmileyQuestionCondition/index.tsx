import { Button, Group, Text, useMantineTheme } from "@mantine/core";

import { mapSmileyIcon } from "@/components/Survey/TakeSurvey/TakeSurveyComponent/SmileyRating/index.tsx";
import { SmileyResponse } from "@/types/enums.ts";

function SmileyQuestionCondition({ currentSelectedEmojis, setState }) {
  const { primaryColor } = useMantineTheme();

  const updateSmileyResponse = (value) => {
    const newState = currentSelectedEmojis?.includes(value)
      ? currentSelectedEmojis.filter((smiley) => smiley !== value)
      : [...currentSelectedEmojis, value];
    setState({ reqOptions: newState });
  };

  return (
    <Group>
      <Text>Select minimum rating for enabling review page:</Text>
      <Group align="center">
        {Object.values(SmileyResponse).map((value) => (
          <Button
            key={value}
            variant={currentSelectedEmojis?.includes(value) ? "light" : "default"}
            gradient={{
              from: "#62CBE6",
              to: "#3F5BA9",
            }}
            onClick={() => updateSmileyResponse(value)}
            style={{
              minHeight: "20px",
              maxWidth: "70px",
            }}
          >
            {mapSmileyIcon(value, primaryColor)}
          </Button>
        ))}
      </Group>
    </Group>
  );
}

export default SmileyQuestionCondition;
