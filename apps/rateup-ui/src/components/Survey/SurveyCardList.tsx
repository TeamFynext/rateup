import { Badge } from "@/components/ui/badge.tsx";

export function StatusBadge({ active }) {
  return (
    <Badge
      className={
        active
          ? "border-transparent bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          : "border-transparent bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
      }
    >
      {active ? "Active" : "Paused"}
    </Badge>
  );
}
