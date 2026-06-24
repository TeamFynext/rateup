import { Group, Text } from "@mantine/core";

export interface LengthTrackerProps {
  length: number;
  maxValue: number;
  atStart?: boolean;
}
export function LengthTracker({ maxValue, length, atStart = false }: LengthTrackerProps) {
  return (
    <Group justify={atStart ? "start" : "flex-end"}>
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
