import { Toast } from "toastify-react-native";
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  FlatList,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Modal,
} from "react-native";
import { useMemo, useState } from "react";
import { countries } from "@/constants/countries";
import {
  ChevronDown,
  ChevronUp,
  Gift,
  Loader2,
  Plus,
  Ticket,
  Trophy,
  User,
} from "lucide-react-native";
import { colors } from "@/constants/constants";

import {
  useAssignRewardMutation,
  useAwardPointsMutation,
  useCustomerRewardsByPhone,
  useLoyaltyTiers,
  useRedeemReward,
  useRedeemRewardByShortCode,
} from "@/api/loyalty/loyalty.query";
import {
  AvailableRewardsCard,
  PendingRedemptionsCard,
} from "./cashierPortal/components";
interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  lightBg: string;
  border: string;
  onPress: () => void;
}

const ActionCard = ({
  title,
  subtitle,
  icon,
  color,
  lightBg,
  border,
  onPress,
}: ActionCardProps) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl p-4 w-[48%] mb-4 border ${
        isDark ? "bg-slate-900 border-slate-800" : ""
      }`}
      style={{
        backgroundColor: isDark ? undefined : lightBg,
        borderColor: border,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: color }}
        >
          {icon}
        </View>

        <View className="flex-1">
          <Text
            className="text-sm font-semibold"
            style={{ color: isDark ? "#fff" : "#0f172a" }}
          >
            {title}
          </Text>
          <Text
            className="text-xs"
            style={{ color: isDark ? "#9ca3af" : "#64748b" }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const CashierPortal = () => {
  const [phone, setPhone] = useState("");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { height } = useWindowDimensions();
  const [couponCode, setCouponCode] = useState("");

  const [issuePointsOpen, setIssuePointsOpen] = useState(false);
  const [claimRewardOpen, setClaimRewardOpen] = useState(false);
  const [assignRewardOpen, setAssignRewardOpen] = useState(false);
  const [redeemCouponOpen, setRedeemCouponOpen] = useState(false);

  const { data: tiers } = useLoyaltyTiers();
  const { data: customerData, isLoading: isLoadingCustomer } =
    useCustomerRewardsByPhone(fullPhoneNumber);
  const awardPoints = useAwardPointsMutation();
  const redeemRewardMutation = useRedeemReward(fullPhoneNumber);
  const assignReward = useAssignRewardMutation(() => {});
  const redeemRewardByShortCode = useRedeemRewardByShortCode();

  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsNotes, setPointsNotes] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [assignRewardNotes, setAssignRewardNotes] = useState("");

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "white" : colors["slate-950"];

  const customer = customerData?.customer;
  const availableRewards = customerData?.availableRewards || [];
  const redeemedRewards = customerData?.redeemedRewards || [];
  const issuableRewards = customerData?.issuableRewards || [];

  const unusedRedemptions = useMemo(() => {
    return redeemedRewards.filter(
      (r) => r.status === "approved" || r.status === "pending",
    );
  }, [redeemedRewards]);

  const tierColor =
    tiers?.find((t) => t.id === customer?.currentTier?.id)?.color || "#C0C0C0";

  const getStatusStyle = () => {
    switch (customer?.status) {
      case "closed":
        return "bg-red-100 text-red-700";
      case "suspended":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-600";
    }
  };

  const handleIssuePoints = async () => {
    if (!customer?.contactId || !pointsAmount) {
      Toast.show({
        type: "error",
        text1: "Please enter points amount",
      });
      return;
    }

    try {
      await awardPoints.mutateAsync({
        contactId: customer.contactId,
        purchaseAmount: Number(pointsAmount),
        notes: pointsNotes,
      });
      Toast.show({
        type: "success",
        text1: "Points issued successfully",
      });
      setIssuePointsOpen(false);
      setPointsAmount("");
      setPointsNotes("");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.error || "Failed to issue points",
      });
    }
  };

  const handleAssignReward = async () => {
    if (!customer?.id || !selectedRewardId) {
      Toast.show({
        type: "error",
        text1: "Please select a reward",
      });
      return;
    }

    try {
      await assignReward.mutateAsync({
        customerId: customer.id,
        rewardId: selectedRewardId,
        notes: assignRewardNotes,
      });
      Toast.show({
        type: "success",
        text1: "Reward assigned successfully",
      });
      setAssignRewardOpen(false);
      setSelectedRewardId("");
      setAssignRewardNotes("");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to assign reward",
      });
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode) {
      Toast.show({
        type: "error",
        text1: "Please enter a coupon code",
      });
      return;
    }
    redeemRewardByShortCode.mutate(couponCode);
    setRedeemCouponOpen(false);
    setCouponCode("");
  };

  const handleClaimReward = async () => {
    if (!fullPhoneNumber || !selectedRewardId) {
      Toast.show({
        type: "error",
        text1: "Please select a reward",
      });
      return;
    }

    try {
      await redeemRewardMutation.mutateAsync({
        customerId: customer?.id || "",
        rewardId: selectedRewardId,
      });
      setClaimRewardOpen(false);
      setSelectedRewardId("");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error?.response?.data?.error || "Failed to claim reward",
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleSelectCountry(item)}
      className="flex-row items-center px-3 py-3 bg-white dark:bg-slate-900"
    >
      <Text className="text-black dark:text-white mr-2">{item.flag}</Text>
      <Text className="text-black dark:text-white mr-2">{item.name}</Text>
      <Text className="text-black dark:text-white text-sm">
        {item.dial_code}
      </Text>
    </TouchableOpacity>
  );

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setShowDropdown(false);
  };

  const handleSearch = () => {
    const formatted = selectedCountry.dial_code + phone.replace(/^0+/, "");
    setFullPhoneNumber(formatted.replace("+", ""));
  };

  return (
    <View className="flex-1 w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row px-5 py-6 bg-primaryBlue items-start">
        <View className="flex-row items-start gap-3 flex-1">
          <Gift color="white" strokeWidth={2} size={26} />
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Cashier Portal</Text>
            <Text className="text-white/80 text-sm mt-1">
              Quick customer lookup and transaction processing
            </Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
          gap: 10,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Search Customer by Phone
          </Text>

          {/* Phone Row */}
          <View className="flex-row items-center">
            {/* Country Selector */}
            <View className="relative">
              <Pressable
                onPress={() => setShowDropdown(!showDropdown)}
                className="flex-row items-center border border-[#E2E5ED] rounded-xl px-3 py-3 bg-white dark:bg-slate-950"
                style={{ minWidth: 100 }}
              >
                <Text className="mr-2 text-base dark:text-white">
                  {selectedCountry.flag}
                </Text>
                <Text className="dark:text-white text-base mr-1">
                  {selectedCountry.dial_code}
                </Text>
                {showDropdown ? (
                  <ChevronUp size={18} color={textColor} />
                ) : (
                  <ChevronDown size={18} color={textColor} />
                )}
              </Pressable>

              {/* Dropdown */}
              {showDropdown && (
                <View
                  className="absolute top-14 rounded-xl border border-[#E2E5ED] shadow-lg bg-white dark:bg-slate-900"
                  style={{
                    width: "260%",
                    maxHeight: height * 0.4,
                    zIndex: 20,
                  }}
                >
                  <FlatList
                    data={countries}
                    keyExtractor={(item) => item.code}
                    renderItem={renderItem}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
            </View>

            {/* Phone Input */}
            <TextInput
              className="flex-1 ml-3 border border-[#E2E5ED] rounded-xl px-4 py-3 dark:text-white text-base bg-white dark:bg-slate-950"
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
          {/* Search Button */}
          <Pressable
            onPress={handleSearch}
            disabled={phone.length < 6}
            className={`mt-5 py-3 rounded-xl items-center ${
              phone.length < 6
                ? "bg-gray-300 dark:bg-slate-700"
                : "bg-primaryBlue active:opacity-80"
            }`}
          >
            <Text className="text-white font-semibold text-base">
              {isLoadingCustomer ? "Searching..." : "Search Customer"}
            </Text>
          </Pressable>
        </View>
        {!customer && (
          <View className="h-full justify-center flex-1 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm items-center">
            {/* Icon */}
            <View className="w-16 h-16 rounded-full bg-primaryBlue/10 items-center justify-center mb-4">
              <User size={28} color={isDark ? "#60a5fa" : "#2563eb"} />
            </View>

            {/* Title */}
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              No Customer Selected
            </Text>

            {/* Description */}
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-5">
              Search for a customer using their phone number to view details and
              perform actions.
            </Text>
          </View>
        )}
        {customer && (
          <View className="flex-1 gap-3">
            {/* customer details */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
              <View className="flex-row justify-between items-start">
                {/* Left Section */}
                <View className="flex-row items-center flex-1">
                  <View className="w-16 h-16 rounded-full bg-primaryBlue/10 items-center justify-center mr-4">
                    <User size={28} color={isDark ? "#60a5fa" : "#2563eb"} />
                  </View>

                  {/* Customer Info */}
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {customer?.name || "N/A"}
                    </Text>

                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {customer?.phone || "N/A"}
                    </Text>

                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {customer?.email || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* grids */}
              <View className="px-4 mt-4">
                <View className="flex-row flex-wrap justify-between">
                  {/* Available Points */}
                  <View className="w-[48%] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-4">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Available Points
                    </Text>
                    <Text className="text-2xl font-bold text-primaryBlue">
                      {customer?.currentPoints || 0}
                    </Text>
                  </View>

                  {/* Lifetime Points */}
                  <View className="w-[48%] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-4">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Lifetime Points
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                      {customer?.lifetimePoints || 0}
                    </Text>
                  </View>

                  {/* Tier */}
                  <View className="w-[48%] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Current Tier
                    </Text>

                    <View className="flex-row items-center">
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: tierColor }}
                      />
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        {customer?.currentTier?.name || "N/A"}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View className="w-[48%] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </Text>

                    <View
                      className={`self-start px-3 py-1 rounded-full ${getStatusStyle()}`}
                    >
                      <Text className="text-xs font-semibold capitalize">
                        {customer?.status || "active"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* quick actions */}
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
              {/* Header */}
              <View className="flex-row items-center gap-1 mb-3">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </Text>
              </View>

              {/* Grid */}
              <View className="flex-row flex-wrap justify-between">
                <ActionCard
                  title="Issue Points"
                  subtitle="Add points"
                  onPress={() => setIssuePointsOpen(true)}
                  color="#1873E8"
                  lightBg="#EFF6FF"
                  border="#DBEAFE"
                  icon={<Plus size={16} color="white" />}
                />

                <ActionCard
                  title="Issue Reward"
                  subtitle="Grant reward"
                  onPress={() => setAssignRewardOpen(true)}
                  color="#A855F7"
                  lightBg="#F5F3FF"
                  border="#E9D5FF"
                  icon={<Gift size={16} color="white" />}
                />

                <ActionCard
                  title="Redeem Coupon"
                  subtitle="Use coupon"
                  onPress={() => setRedeemCouponOpen(true)}
                  color="#F97316"
                  lightBg="#FFF7ED"
                  border="#FED7AA"
                  icon={<Ticket size={16} color="white" />}
                />

                <ActionCard
                  title="Redeem Reward"
                  subtitle="Use points"
                  onPress={() => setClaimRewardOpen(true)}
                  color="#6366F1"
                  lightBg="#EEF2FF"
                  border="#C7D2FE"
                  icon={<Trophy size={16} color="white" />}
                />
              </View>
            </View>

            {/* available rewards */}
            <AvailableRewardsCard
              availableRewards={availableRewards}
              customer={customer}
              isDark={isDark}
              redeemRewardByShortCode={redeemRewardByShortCode}
            />
            <PendingRedemptionsCard
              isDark={isDark}
              unusedRedemptions={unusedRedemptions}
            />
          </View>
        )}
      </ScrollView>

      {/* modals  */}

      <Modal
        visible={issuePointsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIssuePointsOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Issue Points
            </Text>

            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Award points to {customer?.name || "customer"}
            </Text>

            {/* Purchase Amount */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Amount
              </Text>

              <TextInput
                placeholder="Enter amount"
                value={pointsAmount}
                onChangeText={setPointsAmount}
                keyboardType="numeric"
                className="border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 dark:text-white"
                placeholderTextColor="#9CA3AF"
              />

              <Text className="text-[11px] text-gray-400 mt-1">
                Points will be calculated based on earning rules
              </Text>
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </Text>

              <TextInput
                placeholder="Add any notes..."
                value={pointsNotes}
                onChangeText={setPointsNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 bg-white dark:bg-slate-950 dark:text-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Footer Buttons */}
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => setIssuePointsOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleIssuePoints}
                className="px-5 py-2 rounded-lg bg-primaryBlue flex-row items-center"
                disabled={awardPoints?.isPending}
              >
                {awardPoints?.isPending && (
                  <Loader2 size={16} color="white" style={{ marginRight: 6 }} />
                )}
                <Text className="text-white font-semibold">
                  {awardPoints?.isPending ? "Issuing..." : "Issue Points"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={claimRewardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimRewardOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="w-full max-h-[80%] bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Claim Reward
            </Text>

            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Select a reward for {customer?.name || "customer"}
            </Text>

            {/* Reward List */}
            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {availableRewards
                ?.filter(
                  (r: any) =>
                    r.status === "ACTIVE" &&
                    r.rewardType !== "coupon" &&
                    r.pointsCost <= (customer?.currentPoints || 0),
                )
                .map((reward: any) => {
                  const selected = selectedRewardId === reward.id;

                  return (
                    <Pressable
                      key={reward.id}
                      onPress={() => setSelectedRewardId(reward.id)}
                      className={`flex-row justify-between items-center p-3 mb-2 rounded-xl border ${
                        selected
                          ? "border-primaryBlue bg-primaryBlue/5"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      {/* Left */}
                      <View className="flex-1 mr-3">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                          {reward.name}
                        </Text>

                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {reward.description || "No description"}
                        </Text>
                      </View>

                      {/* Points */}
                      <Text className="text-sm font-semibold text-primaryBlue">
                        {reward.pointsCost} pts
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>

            {/* Footer */}
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setClaimRewardOpen(false);
                  setSelectedRewardId(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleClaimReward}
                disabled={!selectedRewardId || redeemRewardMutation?.isPending}
                className={`px-5 py-2 rounded-lg flex-row items-center ${
                  !selectedRewardId
                    ? "bg-gray-300 dark:bg-slate-700"
                    : "bg-primaryBlue"
                }`}
              >
                {redeemRewardMutation?.isPending && (
                  <Loader2 size={16} color="white" style={{ marginRight: 6 }} />
                )}

                <Text className="text-white font-semibold">
                  {redeemRewardMutation?.isPending
                    ? "Claiming..."
                    : "Claim Reward"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={assignRewardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignRewardOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="w-full max-h-[85%] bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Issue Reward
            </Text>

            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Directly assign a reward to {customer?.name || "customer"}
            </Text>

            {/* Reward List */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Reward
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              className="max-h-[250px] mb-4"
            >
              {issuableRewards?.map((reward: any) => {
                const selected = selectedRewardId === reward.id;

                return (
                  <Pressable
                    key={reward.id}
                    onPress={() => setSelectedRewardId(reward.id)}
                    className={`flex-row justify-between items-center p-3 mb-2 rounded-xl border ${
                      selected
                        ? "border-primaryBlue bg-primaryBlue/5"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                        {reward.name}
                      </Text>

                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {reward.description || "No description"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Notes */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </Text>

            <TextInput
              value={assignRewardNotes}
              onChangeText={setAssignRewardNotes}
              placeholder="Add any notes..."
              multiline
              numberOfLines={3}
              className="border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-3 mb-5 text-gray-900 dark:text-white bg-white dark:bg-slate-950"
              placeholderTextColor="#9CA3AF"
            />

            {/* Footer Buttons */}
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setAssignRewardOpen(false);
                  setSelectedRewardId(null);
                  setAssignRewardNotes("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAssignReward}
                disabled={!selectedRewardId || assignReward?.isPending}
                className={`px-5 py-2 rounded-lg flex-row items-center ${
                  !selectedRewardId
                    ? "bg-gray-300 dark:bg-slate-700"
                    : "bg-primaryBlue"
                }`}
              >
                {assignReward?.isPending && (
                  <Loader2 size={16} color="white" style={{ marginRight: 6 }} />
                )}

                <Text className="text-white font-semibold">
                  {assignReward?.isPending ? "Assigning..." : "Assign Reward"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={redeemCouponOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRedeemCouponOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-5">
          <View className="w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800">
            {/* Header */}
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Redeem Coupon
            </Text>

            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
              Enter a coupon code for {customer?.name || "customer"}
            </Text>

            {/* Input */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Coupon Code
            </Text>

            <TextInput
              value={couponCode}
              onChangeText={(text) => setCouponCode(text.toUpperCase())}
              placeholder="Enter coupon code"
              autoCapitalize="characters"
              className="border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-slate-950 mb-2"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Enter the coupon code provided by the customer
            </Text>

            {/* Footer */}
            <View className="flex-row justify-end gap-3">
              <Pressable
                onPress={() => {
                  setRedeemCouponOpen(false);
                  setCouponCode("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700"
              >
                <Text className="text-gray-800 dark:text-gray-200 font-medium">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleRedeemCoupon}
                disabled={!couponCode}
                className={`px-5 py-2 rounded-lg ${
                  !couponCode
                    ? "bg-gray-300 dark:bg-slate-700"
                    : "bg-primaryBlue active:opacity-80"
                }`}
              >
                <Text className="text-white font-semibold">Redeem Coupon</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CashierPortal;
