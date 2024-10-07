import { Button, Group, Stack, Text } from "@mantine/core";

function OpinionQuestionCondition({ currentMinOpinion, setState }) {
  const handleChange = (newMinOpinion) => {
    return () => {
      setState({
        minOpinion: newMinOpinion,
      });
    };
  };

  return (
    <Group>
      <Text>Select minimum scale value for enabling review page:</Text>
      <Stack align="center">
        <Group style={{ minWidth: "250px" }}>
          {(() => {
            const buttons = [];
            for (let i = 1; i <= 10; i++) {
              buttons.push(
                <Button
                  key={i}
                  radius="xl"
                  size="xs"
                  onClick={handleChange(i)}
                  color={currentMinOpinion === i ? "blue" : "blue.9"}
                  variant={currentMinOpinion === i ? "gradient" : "default"}
                  gradient={{
                    from: "#62CBE6",
                    to: "#3F5BA9",
                  }}
                >
                  {i}
                </Button>,
              );
            }
            return buttons;
          })()}
        </Group>
        <Text>{`For ${currentMinOpinion} and above.`}</Text>
      </Stack>
    </Group>
  );
}

export default OpinionQuestionCondition;
