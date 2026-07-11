import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PageType, SubscriptionFeaturePathName } from "@/types/enums.ts";
import { BasicPages, uniquePages } from "@/utils/constants.ts";
import { getPageTypeLabel } from "@/utils/enums/index.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

import { pageIcons } from "./PageIcons.ts";

const hoverClass =
  "hover:border-[var(--tertiary-color)] hover:shadow-[3px_3px_10px_rgba(0,0,0,0.1)]";

const PageTypeSelection = ({ handleTypeSelection, questions, subscription }) => {
  const handleQuestionTypeClick = (type) => {
    handleTypeSelection(type);
  };
  const { t: translations } = useTranslation();

  const QuestionButton = ({ type, subscription }) => {
    const Icon = pageIcons[type];
    const isUpgradeRequired =
      type === PageType.Custom &&
      !hasFeature(subscription, SubscriptionFeaturePathName.HTMLCodePage);
    const isDisabled =
      isUpgradeRequired ||
      (questions?.filter((q: { type: string }) => q.type === type).length > 0 &&
        uniquePages.includes(type));

    if (!isUpgradeRequired) {
      return (
        <Button
          key={type}
          size="lg"
          variant="outline"
          onClick={() => handleQuestionTypeClick(type as PageType)}
          disabled={isDisabled}
        >
          <Icon size={"1rem"} />
          <span className="text-sm">{getPageTypeLabel(type)}</span>
        </Button>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className={cn(
              hoverClass,
              "inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-md border border-input bg-background px-8 text-sm font-medium opacity-50",
            )}
            onClick={(e) => e.preventDefault()}
          >
            <Icon size={"1rem"} />
            <span className="text-sm">{getPageTypeLabel(type)}</span>
          </TooltipTrigger>
          <TooltipContent>{translations("Upgrade Rateup Plan")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="pl-2 flex justify-between">
            <h4 className="text-base font-medium text-muted-foreground">
              {translations("Basic Pages")}
            </h4>
          </div>
          <div className="flex flex-wrap  px-4">
            {BasicPages?.map((type, index) => (
              <div className="p-2" key={index}>
                <QuestionButton type={type} subscription={subscription} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTypeSelection;
