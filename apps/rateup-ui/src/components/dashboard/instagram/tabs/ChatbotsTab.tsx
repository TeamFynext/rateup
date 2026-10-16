import { IconRobot } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ChatbotList } from "@/components/dashboard/chatbots/ChatbotList.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export function ChatbotsTab() {
  const { t } = useTranslation();

  return (
    <Card className="bg-ru-n-25 dark:bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
            <IconRobot className="size-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{t("Instagram Chatbots")}</CardTitle>
            <CardDescription>
              {t("Create and manage chatbots, triggers, and handoff flows.")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChatbotList
          platform={AutomationPlatform.INSTAGRAM}
          detailsBasePath="/dashboard/instagram/flowbots"
        />
      </CardContent>
    </Card>
  );
}
