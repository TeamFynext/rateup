import { Group, Rating, Stack, Text } from "@mantine/core";

function RatingQuestionCondition({ currentMinRating, setState }) {
  const handleChange = (newMinRating) => {
    setState({
      minRating: newMinRating,
    });
  };

  return (
    <Group>
      <Text>Select minimum rating for enabling review page:</Text>
      <Stack align="center">
        <Rating value={currentMinRating} onChange={handleChange} size="xl" />
        <Text>{`${currentMinRating} stars and above.`}</Text>
      </Stack>
    </Group>
  );
}

export default RatingQuestionCondition;
