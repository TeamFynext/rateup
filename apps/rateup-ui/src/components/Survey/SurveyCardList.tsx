import { Badge } from "@mantine/core";

export function StatusBadge({ active }) {
  return <Badge color={active ? "green" : "yellow"}>{active ? "Active" : "Paused"}</Badge>;
}
