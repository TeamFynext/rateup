import { Flex, Grid, Group, SimpleGrid, Stack } from "@mantine/core";
import TestimonialCard from "./TestimonialCard";
import { RateupButtonBlue } from "../Button/RateupButtons";

const TestimonialSelect = () => {
  return (
    <Stack>
      <Group justify="center" ml={200}>
        <RateupButtonBlue title="Select All" />
        <RateupButtonBlue color="black" title="Next" />
      </Group>
      <SimpleGrid cols={3} spacing={"xl"} mt={"lg"}>
        <TestimonialCard />
        <TestimonialCard />
        <TestimonialCard />
        <TestimonialCard />
      </SimpleGrid>
    </Stack>
  );
};

export default TestimonialSelect;
