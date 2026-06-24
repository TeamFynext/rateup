import { useMemo } from "react";

import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MessagePlatform } from "@/types/enums.ts";
import { useGetConversationAccountDistribution } from "@/backend/conversation/conversation.query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

function getMessageSourcePlatformColor(platform: MessagePlatform) {
  switch (platform) {
    case MessagePlatform.WHATSAPP:
      return "green";
    case MessagePlatform.INSTAGRAM:
      return "pink";
    case MessagePlatform.WEBCHAT:
      return "blue";
    default:
      return "blue";
  }
}

const ConversationAccountDistribution = ({ dateRange }) => {
  const { t } = useTranslation();
  const { data: channelDistribution = [], isLoading } =
    useGetConversationAccountDistribution({
      dateRange: dateRange.range,
      dateKey: dateRange.key,
    });
  const totalConversations = useMemo(
    () =>
      channelDistribution.reduce((sum, ch) => sum + ch.conversationCount, 0),
    [channelDistribution],
  );
  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          {t("Channel Distribution")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {channelDistribution.length === 0 ? (
          <div className="grid place-content-center py-12 h-full">
            <h3 className="text-lg font-medium">
              {t("No data found for analysis")}
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              {t("No messages found")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {channelDistribution.map((channel, index) => {
              const percentage = totalConversations
                ? (channel.conversationCount / totalConversations) * 100
                : 0;
              const color = getMessageSourcePlatformColor(
                channel.sourcePlatform as MessagePlatform,
              );
              const phone = channel.phone || channel.ibaId || channel.phoneId;
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-medium">
                        {channel.sourcePlatform ||
                          (channel.ibaId
                            ? "Instagram"
                            : channel.phoneId
                              ? "WhatsApp"
                              : "")}
                        <span className="text-xs text-muted-foreground ml-2">
                          {phone ? `(${phone})` : ""}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {percentage}%
                      </span>
                      <span className="font-semibold min-w-[2.5rem] text-right text-primary">
                        {channel.conversationCount}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <Progress
                      value={percentage}
                      className={`transition-all duration-500`}
                      indicatorColor={color}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationAccountDistribution;
