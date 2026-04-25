"use client";

import { useExtracted } from "next-intl";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import { fallbackImage } from "../../../utils/constants";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { CreditsCard } from "../../Card/CreditsCard";
import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { currencyLabel } from "../util/currencyData";

interface ItemDisplayProps {
  readonly item: any;
  readonly setSelectedItem: (item: MenuItem) => void;
  readonly categoryDisabled: boolean;
  readonly currency: string;
}
export function ItemDisplay({
  item,
  setSelectedItem,
  categoryDisabled = false,
  currency = "0",
}: ItemDisplayProps) {
  const translations = useExtracted();
  const isUnavailable = item?.disabled || categoryDisabled;
  const imageSrc =
    item?.images?.length > 0
      ? encodeURI(
          getFileUrlFromKey(
            item?.images[0],
            true,
            item?.unsplashImage?.find((data) => data === item?.images[0])
              ?.length > 0,
          ),
        )
      : fallbackImage;

  return (
    <Card
      size="sm"
      role={isUnavailable ? undefined : "button"}
      tabIndex={isUnavailable ? -1 : 0}
      onClick={() => !isUnavailable && setSelectedItem(item)}
      onKeyDown={(event) => {
        if (!isUnavailable && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setSelectedItem(item);
        }
      }}
      className={cn(
        !isUnavailable &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <CardContent className="grid gap-4">
        <div className="relative">
          <CreditsCard
            // disabled for now
            enableCredits={false}
            url={item?.images[0]}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={item?.name ?? "Menu item"}
              className={cn(
                "aspect-3/2 w-full rounded-2xl object-cover",
                isUnavailable && "grayscale opacity-60",
              )}
              onError={(event) => {
                (event.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </CreditsCard>
          {isUnavailable && (
            <div className="absolute inset-x-0 top-3 flex justify-center px-3">
              <Badge
                variant="outline"
                className="bg-background/90 text-foreground shadow-sm"
              >
                {translations("Not Available")}
              </Badge>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            isUnavailable && "opacity-70",
          )}
        >
          <div className="space-y-2">
            <p className="line-clamp-2 min-h-11 text-base font-medium capitalize text-foreground sm:text-lg">
              {item?.name}
            </p>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-1">
                <MenuFoodLabelBadge
                  foodLabels={item?.foodLabels ?? []}
                  label={false}
                />
              </div>
            </ScrollArea>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {item?.description}
            </p>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-3 text-center">
            {item?.price?.variants?.length > 0 ? (
              item?.price?.variants.map((varient, index) => (
                <div
                  className="flex flex-col items-center gap-1"
                  key={varient.name ?? index}
                >
                  <span className="truncate text-xs font-medium capitalize text-muted-foreground sm:text-sm">
                    {varient?.name}
                  </span>
                  <span className="text-sm font-semibold text-foreground sm:text-base">
                    {varient?.price && (
                      <>
                        {currencyLabel[currency]?.symbol}
                        {varient?.price}
                      </>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-sm font-semibold text-foreground sm:text-base">
                  {item?.price?.price && (
                    <>
                      {currencyLabel[currency]?.symbol}
                      {item?.price?.price}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
