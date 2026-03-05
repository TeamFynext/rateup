import { Gift, Ticket } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

export const AvailableRewardsCard = ({
  availableRewards,
  customer,
  isDark,
  redeemRewardByShortCode,
}: any) => {
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const openReward = (reward: any) => {
    setSelectedReward(reward);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedReward(null);
  };

  const eligibleRewards = availableRewards?.filter(
    (reward: any) =>
      reward.status === "ACTIVE" &&
      reward.pointsCost <= (customer?.currentPoints || 0),
  );

  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center gap-1 mb-3">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          Available Rewards for Customer
        </Text>
      </View>

      {/* Rewards List */}
      {eligibleRewards?.length > 0 ? (
        eligibleRewards.map((reward: any) => (
          <Pressable
            key={reward.id}
            onPress={() => openReward(reward)}
            className="flex-row items-center justify-between px-3 py-2.5 mb-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {/* Left */}
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-lg bg-primaryBlue/10 items-center justify-center mr-2">
                <Gift size={16} color={isDark ? "#60a5fa" : "#2563eb"} />
              </View>
              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {reward.name}
                </Text>

                <Text
                  numberOfLines={1}
                  className="text-[11px] text-gray-500 dark:text-gray-400"
                >
                  {reward.description || "No description"}
                </Text>

                {reward.rewardType === "coupon" && (
                  <Text
                    numberOfLines={1}
                    className="text-[10px] text-gray-400 dark:text-gray-500"
                  >
                    Code: {(reward.rewardValue as any)?.code}
                  </Text>
                )}
              </View>
            </View>

            {/* Right */}
            <View className="items-end min-w-[70px]">
              <Text className="text-sm font-semibold text-primaryBlue">
                {reward.pointsCost}
                <Text className="text-[10px] text-gray-500 dark:text-gray-400">
                  {" "}
                  pts
                </Text>
              </Text>

              <View className="mt-1 px-2 py-[2px] rounded-full bg-primaryBlue/20">
                <Text className="text-[9px] font-semibold text-primaryBlue">
                  Available
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      ) : (
        <View className="items-center py-8">
          <Gift size={28} color={isDark ? "#475569" : "#cbd5e1"} />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            No rewards available with current points
          </Text>
        </View>
      )}

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-5">
          <View className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <Text className="text-lg font-bold text-gray-900 dark:text-white text-center mb-1">
              {selectedReward?.name}
            </Text>

            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              {selectedReward?.description || "No description"}
            </Text>

            {/* Coupon Box */}
            {selectedReward?.rewardType === "coupon" && (
              <View className="border-2 border-dashed border-primaryBlue rounded-xl py-4 items-center mb-4 bg-primaryBlue/5">
                <Text className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                  COUPON CODE
                </Text>

                <Text className="text-2xl font-bold tracking-widest text-primaryBlue">
                  {(selectedReward.rewardValue as any)?.code}
                </Text>
              </View>
            )}

            {/* Points */}
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Points Required
              </Text>
              <Text className="text-lg font-semibold text-primaryBlue">
                {selectedReward?.pointsCost} pts
              </Text>
            </View>

            {redeemStatus === "success" && (
              <Text className="text-green-600 text-center mb-3">
                Reward redeemed successfully 🎉
              </Text>
            )}

            {redeemStatus === "error" && (
              <Text className="text-red-500 text-center mb-3">
                Failed to redeem reward
              </Text>
            )}

            {/* Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={closeModal}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-slate-700 items-center"
              >
                <Text className="font-semibold text-gray-800 dark:text-white">
                  Close
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 py-3 rounded-xl bg-primaryBlue items-center active:opacity-80"
                onPress={() => {
                  redeemRewardByShortCode.mutate(
                    (selectedReward.rewardValue as any)?.code,
                    {
                      onSuccess: () => {
                        setRedeemStatus("success");
                      },
                      onError: () => {
                        setRedeemStatus("error");
                      },
                    },
                  );
                }}
              >
                <Text className="font-semibold text-white">Redeem</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const PendingRedemptionsCard = ({ unusedRedemptions, isDark }: any) => {
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        Pending Redemptions
      </Text>

      {unusedRedemptions?.length > 0 ? (
        unusedRedemptions.map((redemption: any) => (
          <View
            key={redemption.id}
            className="flex-row items-center justify-between px-3 py-2.5 mb-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {/* Left */}
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-lg bg-primaryBlue/10 items-center justify-center mr-2">
                <Ticket size={16} color={isDark ? "#60a5fa" : "#2563eb"} />
              </View>

              <View className="flex-1">
                <Text
                  numberOfLines={1}
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {redemption.reward?.name || "Reward"}
                </Text>

                <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Redeemed:{" "}
                  {new Date(redemption.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Status */}
            <View className="px-2 py-[2px] rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Text className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 capitalize">
                {redemption.status || "pending"}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View className="items-center py-8">
          <Ticket size={28} color={isDark ? "#475569" : "#cbd5e1"} />
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            No pending redemptions
          </Text>
        </View>
      )}
    </View>
  );
};
