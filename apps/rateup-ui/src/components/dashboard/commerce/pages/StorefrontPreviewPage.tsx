import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useShopStorefrontPreview } from "@/backend/commerce/shop.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { StorefrontPage } from "@/components/shop-public/storefront/StorefrontPage.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { settingsTab } from "../shop/shopMeta.ts";
import { ToneBadge } from "../shop/ShopUi.tsx";

export function StorefrontPreviewPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, error } = useShopStorefrontPreview();
  const [productId, setProductId] = useState<string | undefined>();
  const back = settingsTab("store");

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5 px-4 py-6 sm:px-6">
      <BackLink to={back.to} search={back.search} label={t("Settings")} />
      <PageHeading
        title={t("Storefront preview")}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="info">{t("Preview")}</ToneBadge>
            {t("How shoppers will see your storefront. Checkout is off in the preview.")}
          </span>
        }
      />
      {isPending ? (
        <Skeleton className="mx-auto h-[70dvh] w-full max-w-xl rounded-2xl" />
      ) : isError ? (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("Could not load the preview")}</EmptyTitle>
            <EmptyDescription>{getApiErrorMessage(error, t("Please try again."))}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // The transform makes this frame the containing block for the bag bar, which is
        // `position: fixed` on the real page; without it the bar pins to the dashboard window.
        <div className="mx-auto h-[calc(100dvh-12rem)] min-h-120 w-full max-w-xl transform-gpu overflow-y-auto overscroll-contain rounded-2xl border border-border shadow-sm">
          <StorefrontPage
            storefront={data}
            productId={productId}
            onProductChange={setProductId}
            preview
          />
        </div>
      )}
    </div>
  );
}
