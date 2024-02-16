import { Group, Text } from "@mantine/core";

export interface LengthTrackerProps {
  length: number;
  maxValue: number;
}
export function LengthTracker({ maxValue, length }: LengthTrackerProps) {
  return (
    <Group justify="flex-end" miw={"80px"}>
      <Text c="dimmed" fz={".8rem"} pr="sm">
        <span
          style={{
            color: length > maxValue ? "red" : "inherit",
          }}
        >
          {length}
        </span>
        <span>{` / ${maxValue}`}</span>
      </Text>
    </Group>
  );
}
