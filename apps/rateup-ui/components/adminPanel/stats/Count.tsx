"use client";

import {
  ActionIcon,
  Badge,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import PaperLayout from "../../styled/Layouts/PaperLayout";

export function CountSectionContainer({ label, children }) {
  const [opened, { toggle }] = useDisclosure(true);
  return (
    <Stack
      style={{
        border: "2px solid gray",
        borderRadius: "8px",
        padding: "16px",
        height: "200px",
      }}
      justify="center"
    >
      <Group justify="space-between">
        <Title order={3} style={{ color: "#444" }}>
          {label}
        </Title>
        <ActionIcon onClick={toggle} variant="transparent">
          {opened ? <IconChevronUp /> : <IconChevronDown />}
        </ActionIcon>
      </Group>
      <Collapse in={opened}>
        <Group wrap="nowrap">{children}</Group>
      </Collapse>
    </Stack>
  );
}
interface CountCardProps {
  count: number;
  label: [string, string?]; // [singular, plural]
}
export function CountCard({ count, label }: CountCardProps) {
  if (label.length === 1) label.push(label[0] + "s");

  return (
    <PaperLayout style={{ height: "120px", flexBasis: "fit-content" }}>
      <Stack
        align={"center"}
        justify="center"
        style={{
          height: "100%",
          minWidth: "120px",
          width: "fit-content",
        }}
      >
        <Text fs={"20px"} fw="900" size={"30px"}>
          {count}
        </Text>
        <Badge color="blue" variant="light">
          {count === 1 ? label[0] : label[1]}
        </Badge>
      </Stack>
    </PaperLayout>
  );
}
