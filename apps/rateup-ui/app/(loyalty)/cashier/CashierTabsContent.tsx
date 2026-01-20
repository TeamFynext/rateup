import { Gift, History, Loader2, ShoppingCart, Ticket } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { formatRewardValue } from "./utils";

interface CashierTabsContentProps {
  data: any;
  activeRedemptions: any[];
  pastRedemptions: any[];
  onClaimReward: (id: string) => void;
  onUseRedemption: (id: string) => void;
  isClaiming: boolean;
  selectedRewardId: string | null;
}

export function CashierTabsContent({
  data,
  activeRedemptions,
  pastRedemptions,
  onClaimReward,
  onUseRedemption,
  isClaiming,
  selectedRewardId,
}: Readonly<CashierTabsContentProps>) {
  return (
    <Tabs defaultValue="rewards" className="w-full">
      <TabsList className="w-full justify-start bg-transparent border-b rounded-none mb-6 h-auto p-0 gap-6">
        <TabsTrigger
          value="rewards"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
        >
          <Gift className="h-4 w-4 mr-2" />
          Available Rewards
          <Badge className="ml-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">
            {data.availableRewards.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
        >
          <History className="h-4 w-4 mr-2" />
          Redemption History
          <Badge className="ml-2 bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">
            {pastRedemptions.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="active_mobile"
          className="lg:hidden rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
        >
          <Ticket className="h-4 w-4 mr-2" />
          Active ({activeRedemptions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rewards" className="mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.availableRewards.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500">
                No rewards available for this customer yet.
              </p>
            </div>
          ) : (
            data.availableRewards.map((reward: any) => {
              const canRedeem =
                reward.status === "active" &&
                data.customer.currentPoints >= reward.pointsCost &&
                (reward.stockQuantity === null || reward.stockQuantity > 0);

              return (
                <Card
                  key={reward.id}
                  className={cn(
                    "flex flex-col h-full transition-all duration-200",
                    canRedeem
                      ? "hover:shadow-md hover:-translate-y-1 border-slate-200"
                      : "opacity-60 bg-slate-50",
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <Badge
                        variant="outline"
                        className="font-normal bg-blue-50 text-blue-700 border-blue-100"
                      >
                        {reward.pointsCost} Pts
                      </Badge>
                      {reward.stockQuantity !== null &&
                        reward.stockQuantity < 10 && (
                          <Badge
                            variant="destructive"
                            className="font-normal text-xs"
                          >
                            Only {reward.stockQuantity} left
                          </Badge>
                        )}
                    </div>
                    <CardTitle className="text-lg leading-tight mt-2 min-h-12">
                      {reward.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col pt-0">
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-10">
                      {reward.description ||
                        formatRewardValue(
                          reward.rewardType,
                          reward.rewardValue,
                        )}
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <Button
                        className="w-full"
                        disabled={!canRedeem || isClaiming}
                        onClick={() => onClaimReward(reward.id)}
                        variant={canRedeem ? "default" : "secondary"}
                      >
                        {isClaiming && selectedRewardId === reward.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 mr-2" />
                        )}
                        {canRedeem ? "Redeem Reward" : "Unavailable"}
                      </Button>
                      {!canRedeem && (
                        <p className="text-xs text-center text-red-500 mt-2 font-medium">
                          {data.customer.currentPoints < reward.pointsCost
                            ? `Need ${reward.pointsCost - data.customer.currentPoints} more points`
                            : "Out of stock or inactive"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <div className="divide-y divide-slate-100">
            {pastRedemptions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No redemption history found
              </div>
            ) : (
              pastRedemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {redemption.reward.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(redemption.createdAt).toLocaleDateString()} at{" "}
                      {new Date(redemption.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        redemption.status === "used" ? "default" : "secondary"
                      }
                      className={
                        redemption.status === "used"
                          ? "bg-green-100 text-green-700 hover:bg-green-200 border-none"
                          : ""
                      }
                    >
                      {redemption.status}
                    </Badge>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                      -{redemption.pointsUsed} pts
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="active_mobile" className="lg:hidden">
        <div className="space-y-3">
          {activeRedemptions.map((redemption) => (
            <Card
              key={redemption.id}
              className="border-l-4 border-l-green-500 shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {redemption.reward.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatRewardValue(
                        redemption.reward.rewardType,
                        redemption.reward.rewardValue,
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onUseRedemption(redemption.id)}
                  >
                    Use Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {activeRedemptions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No active redemptions to use
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
