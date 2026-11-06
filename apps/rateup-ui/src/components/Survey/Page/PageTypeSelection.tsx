import { useTranslation } from "react-i18next";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageType, SubscriptionFeaturePathName } from "@/types/enums.ts";
import { BasicPages, uniquePages } from "@/utils/constants.ts";
import { getPageTypeLabel } from "@/utils/enums/index.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { ElementGroupTitle, ElementTypeChip } from "../Question/QuestionTypeSelection.tsx";

const PageTypeSelection = ({
  handleTypeSelection,
  questions,
  subscription,
  query = "",
}: {
  handleTypeSelection: (type: PageType) => void;
  questions: Question[];
  subscription: Subscription;
  query?: string;
}) => {
  const { t: translations } = useTranslation();

  const needle = query.trim().toLowerCase();
  const visiblePages = needle
    ? BasicPages.filter((type) =>
        String(getPageTypeLabel(type) || "")
          .toLowerCase()
          .includes(needle),
      )
    : BasicPages;

  if (!visiblePages.length) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <ElementGroupTitle>{translations("Basic Pages")}</ElementGroupTitle>
      <div className="flex flex-wrap gap-2.5">
        {visiblePages.map((type) => {
          const isUpgradeRequired =
            type === PageType.Custom &&
            !hasFeature(subscription, SubscriptionFeaturePathName.HTMLCodePage);
          const isAlreadyAdded =
            uniquePages.includes(type) &&
            questions?.filter((q: { type: string }) => q.type === type).length > 0;

          const chip = (
            <ElementTypeChip
              type={type}
              disabled={isUpgradeRequired || isAlreadyAdded}
              onClick={() => handleTypeSelection(type as PageType)}
            />
          );

          if (!isUpgradeRequired) return <div key={type}>{chip}</div>;

          return (
            <TooltipProvider key={type}>
              <Tooltip>
                <TooltipTrigger render={<div />}>{chip}</TooltipTrigger>
                <TooltipContent>{translations("Upgrade Rateup Plan")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default PageTypeSelection;
