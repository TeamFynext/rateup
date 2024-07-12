import { useRef, useState } from "react";

import Autoplay from "embla-carousel-autoplay";
import { getCookie, setCookie } from "cookies-next";
import { NextApiRequest, NextApiResponse } from "next";
import { Carousel } from "@mantine/carousel";
import { IconDots, IconMenu2 } from "@tabler/icons-react";
import { isCategoryActive } from "utils/dateTime";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CategoryChip } from "components/menu/category/CategoryChip";
import { getMenuBannerByMenuId } from "backend/menu/Banner/banner.api";
import { CategoryDisplay } from "components/menu/category/CategoryDisplay";
import { CategoriesDrawer } from "components/menu/category/CategoriesDrawer";
import { ItemDetailedViewModal } from "components/menu/item/ItemDetailedViewModal";
import {
  ActionIcon,
  BackgroundImage,
  Box,
  Group,
  Image,
  Paper,
  ScrollArea,
  ScrollAreaAutosize,
  Stack,
  Text,
} from "@mantine/core";

import { lexend } from "../../../../../utils/fonts";
import { CreditsCard } from "../../../../../components/Card/CreditsCard";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import {
  getFullMenuPublicById,
  updateMenuVisitedMutation,
} from "../../../../../backend/menu/menu.api";

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
  let categoryChipLabel = [{ id: "1", name: "all" }].concat(
    fullMenu?.categories,
  );
  const [catagories, setCatagories] = useState(fullMenu?.categories);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryChipLabel[0]?.id,
  );
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [drawerOpen, { open, close }] = useDisclosure();

  if (!fullMenu || !fullMenu?.isPublished || fullMenu?.expiry)
    return (
      <Stack align="center" h="50vh" justify="space-around">
        <Text size="xl" c="red" fw="600">
          {fullMenu?.expiry ? fullMenu?.expiry : "Menu is not available..!"}
        </Text>
      </Stack>
    );
  function handleCategoryChipClick(categoryId: string) {
    setCatagories(
      categoryId === "1"
        ? categoryChipLabel.filter((category) => category.id !== categoryId)
        : categoryChipLabel.filter((category) => category.id === categoryId),
    );
    setSelectedCategory(categoryId);
  }

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

  const { successData, failedData } = catagories.reduce(
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
    categoryChipLabel = [{ id: "1", name: "all" }].concat(fullCategory);
  }

  return (
    <ScrollAreaAutosize mah={"100dvh"} scrollbarSize={0}>
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
                <BackgroundImage
                  px={largeScreen ? "10vw" : "1vw"}
                  py="3vh"
                  src={
                    value?.image
                      ? encodeURI(getFileUrlFromKey(value?.image))
                      : backgroundImageFallback
                  }
                  style={{
                    borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
                    backgroundColor: "var(--orange-400)",
                  }}
                  bgp={"center"}
                  bgsz={"cover"}
                  c={"white"}
                  h={"clamp(224px, 161.136px + 10.476vw, 312px)"}
                  maw={largeScreen ? "2440px" : "768px"}
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
            <Image
              src={
                backgroundImage &&
                getFileUrlFromKey(
                  encodeURI(backgroundImage),
                  true,
                  !!fullMenu.menuLanding?.unsplashImage?.[
                    largeScreen ? "backgroundImage" : "mobileBackgroundImage"
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
          </CreditsCard>
        )}
        <Group
          px={largeScreen ? "xl" : "xs"}
          m="sm"
          wrap="nowrap"
          pos={"sticky"}
          top={0}
          bg={"var(--mantine-color-body)"}
          style={{ zIndex: 10 }}
        >
          <ActionIcon onClick={open} variant="transparent">
            <IconMenu2 color="var(--grey-color)" />
          </ActionIcon>
          <ScrollArea
            h={"min-content"}
            w={"100vw"}
            scrollbarSize={largeScreen ? 10 : 0}
          >
            <Box w={"max-content"}>
              {categoryChipLabel?.map((c) => (
                <CategoryChip
                  key={c.id}
                  categoryId={c.id}
                  name={c.name}
                  selected={selectedCategory === c.id}
                  onClick={handleCategoryChipClick}
                  largeScreen={largeScreen}
                />
              ))}
            </Box>
          </ScrollArea>
        </Group>

        <Stack px={"5.8vw"} mih={"45vh"}>
          {filteredData?.length > 0
            ? filteredData?.map((c) => (
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
            : "No Categories Found"}
        </Stack>
        <CategoriesDrawer
          opened={drawerOpen}
          close={close}
          categories={fullCategory}
          handleCategoryChipClick={handleCategoryChipClick}
          displayName={fullMenu?.displayName}
          logo={fullMenu?.menuLanding?.logo}
          menuButtons={[
            ...(fullMenu?.menuLanding?.surveyTeamMapId
              ? [
                  {
                    name: "Feedback",
                    link: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${fullMenu?.menuLanding?.surveyTeamMap?.shortUrlId ?? fullMenu?.menuLanding?.surveyTeamMapId}`,
                  },
                ]
              : []),
            ...fullMenu.menuLanding.menuButtons,
          ]}
        />
        {selectedItem && (
          <ItemDetailedViewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            currency={fullMenu?.menuLanding?.menu?.currency ?? "0"}
          />
        )}
        <Stack pos={"fixed"} bottom={40} right={30}>
          <ActionIcon bg={"var(--orange-400)"} onClick={open} size={"lg"}>
            <IconDots />
          </ActionIcon>
        </Stack>
      </Paper>
    </ScrollAreaAutosize>
  );
}
