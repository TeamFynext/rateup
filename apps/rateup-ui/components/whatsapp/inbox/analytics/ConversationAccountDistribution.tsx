import { useMemo } from "react";

import { ArrowRight, BarChart3 } from "lucide-react";

import { MessagePlatform } from "@/types/enums";
import { useGetConversationAccountDistribution } from "@/backend/conversation/conversation.query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progressnew";
import { Skeleton } from "@/components/ui/skeleton";

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

const ConversationAccountDistribution = () => {
  const { data: channelDistribution = [], isLoading } =
    useGetConversationAccountDistribution();
  const totalConversations = useMemo(
    () =>
      channelDistribution.reduce((sum, ch) => sum + ch.conversationCount, 0),
    [channelDistribution],
  );
  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-purple-50/30 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm">Channel Distribution</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalConversations} total conversations
              </p>
            </div>
          </div>
          {/* <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-purple-100"
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {channelDistribution.length === 0 ? (
          <div className="grid place-content-center py-12 h-full">
            <h3 className="text-lg font-medium text-gray-900">
              No data found for analysis
            </h3>
            <p className="text-gray-600 mb-4 text-center">No messages found</p>
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
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-white hover:shadow-md hover:border-purple-200 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
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
                          ({channel.phone || channel.ibaId})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {percentage}%
                      </span>
                      <span className="font-semibold min-w-[2.5rem] text-right">
                        {channel.conversationCount}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <Progress
                      value={percentage}
                      className="transition-all duration-500"
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
