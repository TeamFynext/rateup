import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

/**
 * A headline number with no plot.
 *
 * Several figures here are single values with no shape to them — a total is not a trend.
 * Drawing each as a one-bar chart would add ink without meaning, so they get the form that
 * fits. Values wear text tokens, never a series color; identity is the label.
 */
export function StatTile({
  label,
  value,
  note,
  icon,
}: Readonly<{
  label: string;
  value: string;
  note?: string;
  icon?: ReactNode;
}>) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
          {icon}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {note && <CardDescription>{note}</CardDescription>}
      </CardContent>
    </Card>
  );
}
