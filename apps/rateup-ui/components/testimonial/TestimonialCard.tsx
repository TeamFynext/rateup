import {
  Avatar,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Rating,
} from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";

const TestimonialCard = () => {
  return (
    <PaperLayout shadow="xl" p={0} pb={"lg"}>
      <Stack justify="center">
        <Group bg={"blue"} gap={0} align="center" pl={"lg"}>
          <Avatar size={"xl"} />
          <Stack gap={0} c={"white"}>
            <Title order={4}>name</Title>
            <Text>ceo</Text>
          </Stack>
        </Group>
        <Stack px={"lg"}>
          <Text>content</Text>
        </Stack>
        <Stack bg={"black"} justify="center" align="center" py={"xs"}>
          <Rating defaultValue={4} readOnly />
        </Stack>
        <Stack px={"lg"}>
          <Text>Footer</Text>
        </Stack>
      </Stack>
    </PaperLayout>
  );
};

export default TestimonialCard;
