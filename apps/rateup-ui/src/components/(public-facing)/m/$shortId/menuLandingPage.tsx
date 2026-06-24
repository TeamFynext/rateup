import Autoplay from "embla-carousel-autoplay";
import { CircleAlertIcon } from "lucide-react";
import { useRef, useState } from "react";

import { CreditsCard } from "@/components/Card/CreditsCard.tsx";
import { CategoryDisplay } from "@/components/menu/category/CategoryDisplay.tsx";
import { ItemDetailedViewModal } from "@/components/menu/item/ItemDetailedViewModal.tsx";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { isCategoryActive } from "@/utils/dateTime.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import FloatingMenuMain from "./FloatingMenu.tsx";

export default function MenuLandingPage({ fullMenu, menuBanner }) {
  const [autoplayPlugin] = useState(() => Autoplay({ delay: 2000, stopOnInteraction: false }));
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerCategoryRef = (categoryId: string, element: HTMLDivElement | null) => {
    categoryRefs.current[categoryId] = element;
  };

  if (!fullMenu?.isPublished || fullMenu?.expiry)
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-center shadow-sm">
          <p className="text-xl font-semibold text-destructive">
            {fullMenu?.expiry ? fullMenu?.expiry : "Menu is not available..!"}
          </p>
        </div>
      </div>
    );

  const backgroundImageFallback = `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/background.jpg`;
  const hideUnavailableCategory = fullMenu?.menuLanding?.menu?.hideUnavailableCategory as boolean;

  let fullCategory = fullMenu?.categories;

  const { successData, failedData } = (fullCategory ?? []).reduce(
    (acc, item) => {
      if (isCategoryActive(item)) {
        acc.successData.push(item);
      } else {
        acc.failedData.push(item);
      }
      return acc;
    },
    { successData: [], failedData: [] },
  );

  const filteredData = hideUnavailableCategory ? successData : [...successData, ...failedData];

  if (hideUnavailableCategory) {
    fullCategory = fullCategory?.filter(isCategoryActive);
  }

  return (
    <div className="mx-auto max-h-dvh w-full max-w-screen-2xl overflow-y-auto bg-background [scrollbar-width:none]">
      <div className="relative min-h-dvh bg-[radial-gradient(circle_at_top,--theme(--color-primary/10),transparent_35%),linear-gradient(to_bottom,--theme(--color-background),--theme(--color-muted/30))] pb-28">
        {menuBanner?.length > 0 ? (
          <Carousel
            opts={{ loop: true }}
            plugins={[autoplayPlugin]}
            className="border-b border-border/60 bg-muted/20"
          >
            <CarouselContent>
              {menuBanner?.map((value) => (
                <CarouselItem
                  key={value.id}
                  onClick={() => {
                    setSelectedItem({
                      images: [value?.image],
                      description: value?.description,
                      name: value?.name,
                      id: value?.id,
                      price: value?.price,
                      videoUrl: value?.videoUrl,
                      categoryId: value?.menuId,
                      createdAt: value?.createdAt,
                      foodLabels: value?.foodLabels,
                    });
                  }}
                  className="cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      value?.image
                        ? encodeURI(getFileUrlFromKey(value?.image))
                        : backgroundImageFallback
                    }
                    className="aspect-5/1 w-full object-cover max-md:aspect-3/2"
                    alt="menu banner"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = backgroundImageFallback;
                    }}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <CreditsCard
            // disabled for now
            enableCredits={false}
            url={fullMenu?.menuLanding?.backgroundImage}
          >
            <picture>
              <source
                media="(min-width:40em)"
                srcSet={
                  fullMenu?.menuLanding?.backgroundImage &&
                  getFileUrlFromKey(
                    encodeURI(fullMenu?.menuLanding?.backgroundImage),
                    true,
                    !!fullMenu.menuLanding?.unsplashImage?.["backgroundImage"],
                  )
                }
              />
              <img
                src={
                  fullMenu?.menuLanding?.mobileBackgroundImage
                    ? getFileUrlFromKey(
                        encodeURI(fullMenu?.menuLanding?.mobileBackgroundImage),
                        true,
                        !!fullMenu.menuLanding?.unsplashImage?.["mobileBackgroundImage"],
                      )
                    : backgroundImageFallback
                }
                className="aspect-5/1 w-full object-cover max-md:aspect-3/2"
                alt="menu banner"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = backgroundImageFallback;
                }}
              />
            </picture>
          </CreditsCard>
        )}
        <div className="mx-auto flex min-h-[45vh] w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          {filteredData?.length > 0 ? (
            filteredData?.map((c) => (
              <CategoryDisplay
                key={c.id}
                setSelectedItem={setSelectedItem}
                category={c}
                currency={fullMenu?.menuLanding?.menu?.currency ?? "0"}
                hideUnavailableCategory={fullMenu?.menuLanding?.menu?.hideUnavailableCategory}
                registerCategoryRef={registerCategoryRef}
              />
            ))
          ) : (
            <Empty className="min-h-[45vh] rounded-3xl border border-dashed border-border bg-card/70 shadow-sm backdrop-blur">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>No Categories Found</EmptyTitle>
                <EmptyDescription>
                  This menu does not have any visible categories right now.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
        {selectedItem && (
          <ItemDetailedViewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            currency={fullMenu?.menuLanding?.menu?.currency ?? "0"}
          />
        )}

        <FloatingMenuMain
          dynamicVariables={[
            ...(fullMenu?.menuLanding?.surveyTeamMapId
              ? [
                  {
                    name: "feedback",
                    link: `${import.meta.env.VITE_FRONTEND_URL}/ws/${fullMenu?.menuLanding?.surveyTeamMap?.shortUrlId ?? fullMenu?.menuLanding?.surveyTeamMapId}`,
                  },
                ]
              : []),
            ...fullMenu.menuLanding.menuButtons,
          ]}
          categories={fullCategory}
          displayName={fullMenu?.displayName}
          logo={fullMenu?.menuLanding?.logo}
          categoryRefs={categoryRefs}
        />
      </div>
    </div>
  );
}
