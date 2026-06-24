import { IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CreditsCard } from "@/components/Card/CreditsCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel.tsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import YoutubeEmbed from "@/components/youtube/YoutubeEmbed.tsx";
import { fallbackImage } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";
import { extractVideoId } from "@/utils/youtube/url.ts";

import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge.tsx";
import { currencyLabel } from "../util/currencyData.ts";

interface ItemDetailedViewModalProps {
  readonly item: MenuItem;
  readonly onClose: () => void;
  readonly currency: string;
}
export function ItemDetailedViewModal({
  item,
  onClose,
  currency = "0",
}: Readonly<ItemDetailedViewModalProps>) {
  const [allergyView, setAllergyView] = useState(false);
  const foodLabelLength = item?.foodLabels?.length ?? 0;

  const imageStyle = {
    aspectRatio: 3 / 2,
    borderRadius: "12px",
    border: "unset",
    width: "100%",
  };
  const { t: translations } = useTranslation();
  const imageSlides = item?.images?.map((url: string) => (
    <CarouselItem key={url}>
      <CreditsCard
        // disabled for now
        enableCredits={false}
        url={url}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getFileUrlFromKey(
            url,
            true,
            item?.unsplashImage?.find((data) => data === url)?.length > 0,
          )}
          className="aspect-3/2 w-full rounded-2xl object-cover"
          alt={translations("menu item image")}
          onError={(event) => {
            (event.target as HTMLImageElement).src = fallbackImage;
          }}
        />
      </CreditsCard>
    </CarouselItem>
  ));

  const videoSlides = item?.videoUrl && (
    <CarouselItem>
      <YoutubeEmbed embedId={extractVideoId(item?.videoUrl)} sx={imageStyle} />
    </CarouselItem>
  );
  const count = item?.images?.length + (item?.videoUrl ? 1 : 0);

  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-border/60 p-0 shadow-xl">
        <DialogTitle className="sr-only">{item?.name}</DialogTitle>
        <div className="bg-background">
          {/* Media section */}
          <div>
            {item?.images?.length > 0 || item?.videoUrl ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {videoSlides}
                  {imageSlides}
                </CarouselContent>
                {count > 1 && <CarouselPrevious />}
                {count > 1 && <CarouselNext />}
              </Carousel>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="aspect-3/2 w-full object-cover h-50"
                src={fallbackImage}
                alt={translations("Menu Item Images")}
              />
            )}
          </div>

          {allergyView ? (
            item?.foodLabels?.length > 0 && (
              <div className="flex flex-col gap-4 px-4 py-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {translations("Allergen Info")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 overflow-x-scroll">
                    <MenuFoodLabelBadge foodLabels={item?.foodLabels ?? []} />
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={() => setAllergyView(false)}>
                  <IconArrowLeft data-icon="inline-start" />
                  {translations("Go Back")}
                </Button>
              </div>
            )
          ) : (
            <>
              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="space-y-3">
                  <p className="line-clamp-2 text-center font-heading text-xl font-semibold capitalize text-foreground">
                    {item.name}
                  </p>
                  <ScrollArea className="max-h-40">
                    <pre className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">
                      {item.description}
                    </pre>
                  </ScrollArea>
                </div>
                {foodLabelLength > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      {translations("Allergen Info")}
                    </p>
                    <div className="flex w-full items-center gap-2">
                      <div
                        className="flex min-h-6 flex-1 items-center gap-1 overflow-hidden"
                        style={{ maxWidth: "300px" }}
                      >
                        <MenuFoodLabelBadge foodLabels={item?.foodLabels ?? []} />
                      </div>
                      {foodLabelLength > 1 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs"
                          onClick={() => setAllergyView(true)}
                        >
                          {translations("Show All")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-3 px-4 py-4 text-center text-foreground">
                {item.price.variants?.length > 0 ? (
                  item.price.variants.map((varient, index) => (
                    <div className="flex flex-col items-center gap-1" key={varient.name ?? index}>
                      <span className="truncate text-sm font-medium capitalize">
                        {varient.name}
                      </span>
                      <span className="text-base font-semibold text-foreground">
                        {varient?.price && (
                          <>
                            {currencyLabel[currency]?.symbol}
                            {varient.price}
                          </>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold text-foreground">
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
