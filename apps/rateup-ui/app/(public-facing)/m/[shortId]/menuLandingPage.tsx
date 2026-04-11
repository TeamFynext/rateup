"use client";

import { useRef, useState } from "react";

import {
  Container,
  Image,
  Paper,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Autoplay from "embla-carousel-autoplay";

import { CreditsCard } from "@/components/Card/CreditsCard";
import { CategoryDisplay } from "@/components/menu/category/CategoryDisplay";
import { ItemDetailedViewModal } from "@/components/menu/item/ItemDetailedViewModal";
import NothingFound from "@/components/NothingFound/NothingFound";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { isCategoryActive } from "@/utils/dateTime";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import FloatingMenuMain from "./FloatingMenu";
import styles from "./gradientAnimation.module.css";

export default function MenuLandingPage({ fullMenu, menuBanner }) {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const autoplay: any = useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false }),
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const categoryRefs = useRef({});

  if (!fullMenu || !fullMenu?.isPublished || fullMenu?.expiry)
    return (
      <Stack align="center" h="50vh" justify="space-around">
        <Text size="xl" c="red" fw="600">
          {fullMenu?.expiry ? fullMenu?.expiry : "Menu is not available..!"}
        </Text>
      </Stack>
    );
  const backgroundImage = largeScreen
    ? fullMenu?.menuLanding?.backgroundImage
    : fullMenu?.menuLanding?.mobileBackgroundImage;
  const backgroundImageFallback = largeScreen
    ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/background.jpg`
    : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/mobileBackground.jpg`;
  const hideUnavailableCategory = fullMenu?.menuLanding?.menu
    ?.hideUnavailableCategory as boolean;

  let fullCategory = fullMenu?.categories;

  const { successData, failedData } = fullCategory?.reduce(
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

  const filteredData = hideUnavailableCategory
    ? successData
    : [...successData, ...failedData];

  if (hideUnavailableCategory) {
    fullCategory = fullCategory?.filter(isCategoryActive);
  }

  return (
    <ScrollAreaAutosize scrollbarSize={0} className={styles.scrollArea}>
      <Paper className={styles.paper}>
        {menuBanner?.length > 0 ? (
          <Carousel opts={{ loop: true }} plugins={[autoplay.current]}>
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
                  <Image
                    src={
                      value?.image && encodeURI(getFileUrlFromKey(value?.image))
                    }
                    className={styles.gradient}
                    alt="menu banner image"
                    fallbackSrc={backgroundImageFallback}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <CreditsCard
            // enableCredits={
            //   !!fullMenu.menuLanding?.unsplashImage?.[
            //     largeScreen ? "backgroundImage" : "mobileBackgroundImage"
            //   ]
            // }
            // disabled for now
            enableCredits={false}
            url={backgroundImage}
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
              <Image
                src={
                  fullMenu?.menuLanding?.mobileBackgroundImage &&
                  getFileUrlFromKey(
                    encodeURI(fullMenu?.menuLanding?.mobileBackgroundImage),
                    true,
                    !!fullMenu.menuLanding?.unsplashImage?.[
                      "mobileBackgroundImage"
                    ],
                  )
                }
                className={styles.gradient}
                fallbackSrc={backgroundImageFallback}
                alt="banner image of menu"
              />
            </picture>
          </CreditsCard>
        )}
        <Container size={"95vw"} mih={"45vh"} mt={"sm"} mb={70}>
          {filteredData?.length > 0 ? (
            filteredData?.map((c) => (
              <CategoryDisplay
                key={c.id}
                setSelectedItem={setSelectedItem}
                category={c}
                currency={fullMenu?.menuLanding?.menu?.currency ?? "0"}
                hideUnavailableCategory={
                  fullMenu?.menuLanding?.menu?.hideUnavailableCategory
                }
                categoryRefs={categoryRefs}
              />
            ))
          ) : (
            <NothingFound text="No Categories Found" />
          )}
        </Container>
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
                    link: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${fullMenu?.menuLanding?.surveyTeamMap?.shortUrlId ?? fullMenu?.menuLanding?.surveyTeamMapId}`,
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
      </Paper>
    </ScrollAreaAutosize>
  );
}
