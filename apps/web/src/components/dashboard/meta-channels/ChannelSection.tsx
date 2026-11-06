// The card every Instagram and Messenger tab is built from: an icon, a title, one line of
// description and the section's actions on the right.

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rateup/ui/components/card";
import type { TablerIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";

export function ChannelSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: Readonly<{
  icon: TablerIcon;
  title: string;
  description: ReactNode;
  /** Right of the title: a preview, a count, the primary action (last). */
  actions?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-48 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
