import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { updateShopStore, type ShopStoreUpdate } from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * One settings card's draft of store fields, saved with its own button through PATCH /shop/store.
 * Mount it keyed on the server values so a save elsewhere reseeds the draft.
 */
export function useStoreSection<T extends object>(
  initial: T,
  toPatch: (draft: T) => ShopStoreUpdate,
) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const [draft, setDraft] = useState<T>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const save = useMutation({
    mutationFn: () => updateShopStore(toPatch(draft)),
    onSuccess: () => {
      toast.success(t("Saved"));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not save"))),
  });
  return {
    draft,
    set: (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch })),
    dirty,
    save,
    reset: () => setDraft(initial),
  };
}

export const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
