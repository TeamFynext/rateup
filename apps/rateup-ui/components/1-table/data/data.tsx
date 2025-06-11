import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconBook,
  IconBug,
  IconBulb,
  IconCircle,
  IconCircleCheck,
  IconCircleOff,
  IconClock,
  IconHelp,
} from "@tabler/icons-react";

export const labels = [
  {
    value: "bug",
    label: "Bug",
    icon: IconBug,
  },
  {
    value: "feature",
    label: "Feature",
    icon: IconBulb,
  },
  {
    value: "documentation",
    label: "Documentation",
    icon: IconBook,
  },
];

export const statuses = [
  {
    value: "backlog",
    label: "Backlog",
    icon: IconHelp,
  },
  {
    value: "todo",
    label: "Todo",
    icon: IconCircle,
  },
  {
    value: "in progress",
    label: "In Progress",
    icon: IconClock,
  },
  {
    value: "done",
    label: "Done",
    icon: IconCircleCheck,
  },
  {
    value: "canceled",
    label: "Canceled",
    icon: IconCircleOff,
  },
];

export const priorities = [
  {
    label: "Low",
    value: "low",
    icon: IconArrowDown,
  },
  {
    label: "Medium",
    value: "medium",
    icon: IconArrowRight,
  },
  {
    label: "High",
    value: "high",
    icon: IconArrowUp,
  },
];
