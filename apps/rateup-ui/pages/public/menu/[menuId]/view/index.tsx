import {
  ActionIcon,
  Group,
  Paper,
  Stack,
  Text,
  Image,
  BackgroundImage,
  Box,
  ScrollArea,
  ScrollAreaAutosize,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconMenu2 } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import { useRef, useState } from "react";
import { CategoryChip } from "../../../../../components/menu/category/CategoryChip";
import { CategoryDisplay } from "../../../../../components/menu/category/CategoryDisplay";
import { CategoriesDrawer } from "../../../../../components/menu/category/CategoriesDrawer";
import { ItemDetailedViewModal } from "../../../../../components/menu/item/ItemDetailedViewModal";
import { getFullMenuPublicById } from "../../../../../backend/menu/menu.api";
import { useRouter } from "next/router";
import { lexend } from "../../../../../utils/fonts";
import { Carousel } from "@mantine/carousel";
import { getMenuBannerByMenuId } from "../../../../../backend/menu/Banner/banner.api";
import Autoplay from "embla-carousel-autoplay";
import { isCategoryActive } from "../../../../../utils/dateTime";
import { CreditsCard } from "../../../../../components/Card/CreditsCard";

type MenuViewProp = {
  menuId: string;
};

export const getServerSideProps = async (context: { params: MenuViewProp }) => {
  const params = context.params;

  const fullMenu = await getFullMenuPublicById(params.menuId);
  const menuBanner = await getMenuBannerByMenuId(params.menuId);

  return { props: { fullMenu: fullMenu, menuBanner: menuBanner } };
};

export default function MenuLandingDetail({ fullMenu, menuBanner }) {
  const router = useRouter();
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const autoplay = useRef(Autoplay({ delay: 2000, stopOnInteraction: false }));
  let categoryChipLabel = [{ id: "1", name: "all" }].concat(
    fullMenu?.categories,
  );
  const [catagories, setCategorys] = useState(fullMenu?.categories);
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
    setCategorys(
      categoryId === "1"
        ? categoryChipLabel.filter((category) => category.id !== categoryId)
        : categoryChipLabel.filter((category) => category.id === categoryId),
    );
    setSelectedCategory(categoryId);
  }

  const backgroundImageBorderRadius = largeScreen ? "47px" : "22px";
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
      <Paper mih={"100dvh"} ff={lexend.style.fontFamily} maw={"100vw"}>
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
                ></BackgroundImage>
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
            <BackgroundImage
              px={largeScreen ? "10vw" : "1vw"}
              py="3vh"
              src={
                backgroundImage
                  ? getFileUrlFromKey(
                      encodeURI(backgroundImage),
                      true,
                      !!fullMenu.menuLanding?.unsplashImage?.[
                        largeScreen
                          ? "backgroundImage"
                          : "mobileBackgroundImage"
                      ],
                    )
                  : backgroundImageFallback
              }
              style={{
                borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
                backgroundColor: "var(--orange-400)",
              }}
              bgp={"center"}
              bgsz={"cover"}
              c={"white"}
              h={largeScreen ? "33dvh" : "25dvh"}
              maw={largeScreen ? "2440px" : "768px"}
            >
              <Stack
                align="center"
                style={{
                  padding: "0 20px 0 20px",
                }}
                justify="center"
                h="100%"
                mb="lg"
              >
                {fullMenu?.logo && (
                  <Image
                    w="100px"
                    h={"100px"}
                    style={{
                      borderRadius: "4px",
                    }}
                    src={getFileUrlFromKey(fullMenu?.logo)}
                    alt="logo of org"
                  />
                )}
                <Stack gap={0}>
                  <Text
                    ta={"center"}
                    fz={
                      fullMenu?.menuLanding?.headerStyle?.fontSize
                        ? `clamp(18px, 8px + 1.667vw, ${fullMenu?.menuLanding?.headerStyle?.fontSize}px)`
                        : "clamp(18px, 8px + 1.667vw, 32px)"
                    }
                    fw={
                      fullMenu?.menuLanding?.headerStyle?.fontWeight ?? "bold"
                    }
                    c={fullMenu?.menuLanding?.headerStyle?.color ?? "inherit"}
                  >
                    {fullMenu?.menuLanding?.headerText ?? "Welcome To"}
                  </Text>
                  <Text
                    fz={
                      fullMenu?.menuLanding?.titleStyle?.fontSize
                        ? `clamp(28px, 13.712px + 2.381vw,${fullMenu?.menuLanding?.titleStyle?.fontSize}px )`
                        : "clamp(28px, 13.712px + 2.381vw, 48px))"
                    }
                    fw={fullMenu?.menuLanding?.titleStyle?.fontWeight ?? "bold"}
                    c={fullMenu?.menuLanding?.titleStyle?.color ?? "inherit"}
                    ta={"center"}
                  >
                    {fullMenu?.displayName ?? "Name"}
                  </Text>
                </Stack>
              </Stack>
            </BackgroundImage>
          </CreditsCard>
        )}
        <Group
          px={largeScreen ? "xl" : "xs"}
          m="sm"
          wrap="nowrap"
          pos={"sticky"}
          top={0}
          bg={"white"}
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
        />
        {selectedItem && (
          <ItemDetailedViewModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            currency={fullMenu?.menuLanding?.menu?.currency ?? "0"}
          />
        )}
        <Stack pos={"fixed"} bottom={40} right={30}>
          {fullMenu?.menuLanding?.feedbackPageEnabled && (
            <Stack
              w={largeScreen ? "90px" : "70px"}
              h={largeScreen ? "90px" : "70px"}
              bg={"#F8951D"}
              style={{ borderRadius: "100%", cursor: "pointer" }}
              justify="center"
              align="center"
              gap={0}
              onClick={() => {
                router.push(
                  `${process.env.NEXT_PUBLIC_FRONTEND_URL}/ws/${fullMenu?.menuLanding?.surveyTeamMap?.shortUrlId ?? fullMenu?.menuLanding?.surveyTeamMapId}`,
                );
              }}
            >
              <Image
                src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/whiteRateUpLogo.png`}
                w={largeScreen ? "42px" : "26px"}
                h={largeScreen ? "38px" : "26px"}
                alt="logo of rateup"
              />
              <Text
                fz={"clamp(11.008px, 8.144px + 0.476vw, 15.008px)"}
                c={"white"}
                fw={500}
              >
                Feedback
              </Text>
            </Stack>
          )}
        </Stack>
      </Paper>
    </ScrollAreaAutosize>
  );
}
