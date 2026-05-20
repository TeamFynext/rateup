import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card.tsx";

interface SettingsCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function SettingsCard({ title, icon, children }: SettingsCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400 [&_svg]:w-5 [&_svg]:h-5">
            {icon}
            <p className="text-base font-semibold text-gray-900 dark:text-gray-50 m-0">
              {title}
            </p>
          </div>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
