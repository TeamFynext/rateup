import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
        <Card className="bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 mb-4">
            <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        {title && (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</span>
                                {badge}
                            </div>
                        )}
                        {leftContent}
                    </div>
                    <div>
                        {rightTitle && (
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-50 block mb-2">
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
