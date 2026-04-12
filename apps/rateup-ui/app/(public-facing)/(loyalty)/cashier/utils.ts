export const formatRewardValue = (rewardType: string, rewardValue: any) => {
  if (rewardType === "discount_fixed") {
    return `$${rewardValue.amount} off`;
  } else if (rewardType === "discount_percentage") {
    return `${rewardValue.percentage}% off${
      rewardValue.maxAmount ? ` (max $${rewardValue.maxAmount})` : ""
    }`;
  } else if (rewardType === "free_item") {
    return `Free ${rewardValue.itemName}${
      rewardValue.quantity ? ` x${rewardValue.quantity}` : ""
    }`;
  } else if (rewardType === "point") {
    return `${rewardValue.points} points`;
  } else if (rewardType === "coupon") {
    return `Coupon${rewardValue.code ? `: ${rewardValue.code}` : ""}`;
  } else if (rewardType === "assigned") {
    return rewardValue.description || "Special Reward";
  }
  return "N/A";
};
