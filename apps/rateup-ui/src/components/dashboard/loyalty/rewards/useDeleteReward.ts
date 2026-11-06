import { useTranslation } from "react-i18next";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import { useDeleteLoyaltyRewardMutation } from "@/backend/loyalty/reward.query";
import { useConfirm } from "@/context/confirm-provider.tsx";

/** Asks first, then deletes. The API refuses while a redemption is still pending. */
export function useDeleteReward(onDeleted?: () => void) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const mutation = useDeleteLoyaltyRewardMutation(onDeleted);

  const deleteReward = async (reward: Pick<LoyaltyReward, "id" | "name">) => {
    const ok = await confirm({
      title: t("Delete {name}?", { name: reward.name }),
      description: t(
        "It leaves the catalog straight away. A reward someone is still waiting to use cannot be deleted — switch it off instead, and nobody new can get it.",
      ),
      confirmText: t("Delete"),
    });
    if (ok) mutation.mutate(reward.id);
  };

  return { deleteReward, isPending: mutation.isPending };
}
