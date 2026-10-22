import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { duplicateShopProduct } from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/** A draft copy of a product; the caller decides where to go once it exists. */
export function useDuplicateProduct() {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  return useMutation({
    mutationFn: duplicateShopProduct,
    onSuccess: () => {
      toast.success(t("Copy saved as a draft"));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not duplicate the product"))),
  });
}
