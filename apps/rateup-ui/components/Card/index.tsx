import { Center, Paper, Stack, Text } from "@mantine/core";

const CardButton = ({ title }) => {
  return (
    <Paper
      p="md"
      shadow="md"
      radius="md"
      style={{ cursor: "pointer", height: 200, width: 400 }}
    >
      <Center h="100%">
        <Stack align="center">
          <Text size="xl">{title}</Text>
        </Stack>
      </Center>
    </Paper>
  );
};

export default CardButton;
