import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card.tsx";

interface ShareSectionProps {
  title?: string;
  badge?: ReactNode;
  leftContent: ReactNode;
  rightContent: ReactNode;
  rightTitle?: string;
}

export function ShareSection({
  title,
  badge,
  leftContent,
  rightContent,
  rightTitle,
}: ShareSectionProps) {
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {title && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">
                  {title}
                </span>
                {badge}
              </div>
            )}
            {leftContent}
          </div>
          <div>
            {rightTitle && (
              <span className="text-sm font-semibold text-foreground block mb-1">
                {rightTitle}
              </span>
            )}
            {rightContent}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
