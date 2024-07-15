import { useRef, useState } from "react";
import { NextApiRequest, NextApiResponse } from "next";

import { getMenuBannerByMenuId } from "@/backend/menu/Banner/banner.api";
import {
  getFullMenuPublicById,
  updateMenuVisitedMutation,
} from "@/backend/menu/menu.api";
import { isCategoryActive } from "@/utils/dateTime";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";
import { lexend } from "@/utils/fonts";
import { Carousel } from "@mantine/carousel";
import { Image, Paper, ScrollAreaAutosize, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { getCookie, setCookie } from "cookies-next";
import Autoplay from "embla-carousel-autoplay";

import { CreditsCard } from "@/components/Card/CreditsCard";
import { CategoryDisplay } from "@/components/menu/category/CategoryDisplay";
import { ItemDetailedViewModal } from "@/components/menu/item/ItemDetailedViewModal";
import NothingFound from "@/components/NothingFound/NothingFound";

import FloatingMenuMain from "./FloatingMenu";

interface ServerSidePropsContext {
  req: NextApiRequest;
  res: NextApiResponse;
  params: {
    menuId: string;
    surveyId: string;
  };
}

export const getServerSideProps = async ({
  req,
  res,
  params,
}: ServerSidePropsContext) => {
  const fullMenu = await getFullMenuPublicById(params.menuId);
  const menuBanner = await getMenuBannerByMenuId(params.menuId);
  const pageVisited = getCookie("pageVisited", { req, res });

  if (!pageVisited && !fullMenu?.expiry) {
    setCookie("pageVisited", "true", {
      req,
      res,
      maxAge: 60 * 60,
      httpOnly: true,
    });
    await updateMenuVisitedMutation(params.menuId);
  }
  return { props: { fullMenu: fullMenu, menuBanner: menuBanner } };
};

export default function MenuLandingPage({ fullMenu, menuBanner }) {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const autoplay = useRef(Autoplay({ delay: 2000, stopOnInteraction: false }));
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  if (!fullMenu || !fullMenu?.isPublished || fullMenu?.expiry)
    return (
      <Stack align="center" h="50vh" justify="space-around">
        <Text size="xl" c="red" fw="600">
          {fullMenu?.expiry ? fullMenu?.expiry : "Menu is not available..!"}
        </Text>
      </Stack>
    );
  const backgroundImageBorderRadius = "22px";
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
    <ScrollAreaAutosize
      mah={"100dvh"}
      scrollbarSize={0}
      styles={{
        viewport: {
          scrollBehavior: "smooth",
        },
      }}
    >
      <Paper
        mih={"100dvh"}
        ff={lexend.style.fontFamily}
        maw={largeScreen ? "2440px" : "768px"}
        w={"100vw"}
      >
        {menuBanner?.length > 0 ? (
          <Carousel
            withIndicators
            plugins={[autoplay.current]}
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
            controlsOffset="lg"
            loop
          >
            {menuBanner?.map((value) => (
              <Carousel.Slide
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
                style={{
                  cursor: "pointer",
                }}
              >
                <Image
                  src={
                    value?.image && encodeURI(getFileUrlFromKey(value?.image))
                  }
                  style={{
                    borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
                    backgroundColor: "var(--orange-400)",
                  }}
                  bgp={"center"}
                  bgsz={"cover"}
                  h={"clamp(224px, 161.136px + 10.476vw, 312px)"}
                  maw={largeScreen ? "2440px" : "768px"}
                  alt="menu banner image"
                  fallbackSrc={backgroundImageFallback}
                />
              </Carousel.Slide>
            ))}
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
            pl={largeScreen && 30}
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
                style={{
                  borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
                  backgroundColor: "var(--orange-400)",
                }}
                fallbackSrc={backgroundImageFallback}
                alt="banner image of menu"
                h={largeScreen ? "33dvh" : "25dvh"}
                maw={largeScreen ? "2440px" : "768px"}
              />
            </picture>
          </CreditsCard>
        )}
        <Stack px={"5.8vw"} mih={"45vh"} mt={"sm"}>
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
              />
            ))
          ) : (
            <NothingFound text="No Categories Found" />
          )}
        </Stack>
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
          largeScreen={largeScreen}
        />
      </Paper>
    </ScrollAreaAutosize>
  );
}
