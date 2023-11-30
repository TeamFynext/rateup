import {
  Center,
  Group,
  Stack,
  Text,
  Image,
  BackgroundImage,
  Flex,
  SimpleGrid,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import classes from "./Feedback.module.css";
import {
  getMenuPublicById,
  updateMenuVisitedMutation,
} from "../../../../../backend/menu/menu.api";
import { Data } from "../../../../../types/global";
import Link from "next/link";
import PaperLayout from "../../../../../components/styled/Layouts/PaperLayout";
import { lexend } from "../../../../../utils/fonts";

type MenuProp = {
  menuId: string;
  surveyId: string;
};

export const getServerSideProps = async (context: { params: MenuProp }) => {
  const params = context.params;

  const menuLanding = await getMenuPublicById(params.menuId);
  await updateMenuVisitedMutation(params.menuId);

  return { props: { menuLanding: menuLanding } };
};

export default function ({ menuLanding }: { menuLanding: Data }) {
  const largeScreen = useMediaQuery("(min-width: 40em)");
  if (!menuLanding || !menuLanding?.menu?.isPublished)
    return (
      <Stack align="center" h="50vh" justify="space-around">
        <Text size="xl" c="red" fw="600">
          Menu is not available..!
        </Text>
      </Stack>
    );
  const backgroundImageBorderRadius = largeScreen ? "47px" : "22px";
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const fallbackImageBackround = largeScreen
    ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/background.jpg`
    : `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/mobileBackground.jpg`;
  const backgroundImage = largeScreen
    ? menuLanding?.backgroundImage
    : menuLanding?.mobileBackgroundImage;

  const bgSrc = backgroundImage
    ? getFileUrlFromKey(encodeURI(backgroundImage))
    : fallbackImageBackround;
  return (
    <Stack
      gap={0}
      maw={largeScreen ? "2440px" : "768px"}
      ff={lexend.style.fontFamily}
    >
      <BackgroundImage
        src={bgSrc}
        radius="sm"
        h={largeScreen ? "50vh" : "40vh"}
        maw={largeScreen ? "2440px" : "768px"}
        bgsz={"cover"}
        bgp={"center"}
        style={{
          borderRadius: `0 0 ${backgroundImageBorderRadius} ${backgroundImageBorderRadius}`,
          backgroundColor: "var(--orange-400)",
        }}
      >
        <Stack
          align="center"
          justify={largeScreen ? "space-around" : "center"}
          h={"100%"}
          style={{
            padding: largeScreen ? "0 20px 0 20px" : "0",
          }}
        >
          <div></div>
          <Stack align="center" gap={0} px={"50px"}>
            {menuLanding?.menu?.logo && (
              <Image
                src={getFileUrlFromKey(menuLanding?.menu?.logo)}
                w={largeScreen ? 100 : 63}
                maw={100}
                radius={"md"}
                fallbackSrc={fallbackImage}
                alt="menuLanding logo"
              />
            )}
            <Text
              fz={
                menuLanding?.headerStyle?.fontSize
                  ? `clamp(0.938rem, 0.313rem + 1.667vw, ${menuLanding?.headerStyle?.fontSize}px)`
                  : "clamp(0.938rem, 0.313rem + 1.667vw, 1.813rem)"
              }
              fw={menuLanding?.headerStyle?.fontWeight ?? "bold"}
              c={menuLanding?.headerStyle?.color ?? "inherit"}
              truncate
              mt={10}
            >
              {menuLanding?.headerText ?? "Welcome To"}
            </Text>
            <Text
              fz={
                menuLanding?.titleStyle?.fontSize
                  ? `clamp(1.688rem, -0.679rem + 6.31vw,${menuLanding?.titleStyle?.fontSize}px )`
                  : "clamp(1.688rem, -0.679rem + 6.31vw,52px )"
              }
              fw={menuLanding?.titleStyle?.fontWeight ?? "bold"}
              c={menuLanding?.titleStyle?.color ?? "inherit"}
              ta={"center"}
            >
              {menuLanding?.menu?.displayName}
            </Text>
          </Stack>
          <Center p={0} w={largeScreen && "100%"}>
            <Flex
              align={largeScreen ? "center" : "start"}
              justify={"space-between"}
              direction={largeScreen ? "row" : "column"}
              w={"100%"}
              px={largeScreen && "100"}
              pb={"lg"}
            >
              {menuLanding?.menu?.websiteText && (
                <Link
                  className={classes.base1}
                  href={
                    menuLanding?.menu?.websiteUrl
                      ? menuLanding?.menu?.websiteUrl
                      : "#"
                  }
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    ...menuLanding?.otherStyle,
                    cursor: !menuLanding?.menu?.websiteUrl && "default",
                  }}
                  target={menuLanding?.menu?.websiteUrl && "_blank"}
                >
                  <Group>
                    <IconWorld
                      size={"clamp(21.008px, 7.424px + 2.262vw, 40px)"}
                    />
                    <Text
                      maw={largeScreen ? "350px" : "188px"}
                      miw={!largeScreen && 188}
                      tt={"capitalize"}
                      ta={largeScreen ? "center" : "start"}
                      fz={"clamp(0.813rem, 0.5rem + 0.833vw, 1.25rem)"}
                    >
                      {menuLanding?.menu?.websiteText}
                    </Text>
                  </Group>
                </Link>
              )}
              {menuLanding?.menu?.locationText && (
                <Link
                  className={classes.hoverEffect}
                  href={
                    menuLanding?.menu?.locationUrl
                      ? menuLanding?.menu?.locationUrl
                      : "#"
                  }
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    ...menuLanding?.otherStyle,
                    cursor: !menuLanding?.menu?.locationUrl && "default",
                  }}
                  target={menuLanding?.menu?.locationUrl && "_blank"}
                >
                  <Group>
                    <IconMapPin
                      size={"clamp(21.008px, 7.424px + 2.262vw, 40px)"}
                    />
                    <Text
                      maw={largeScreen ? "350px" : "188px"}
                      miw={!largeScreen && 188}
                      tt={"capitalize"}
                      ta={largeScreen ? "center" : "start"}
                      fz={"clamp(0.813rem, 0.5rem + 0.833vw, 1.25rem)"}
                    >
                      {menuLanding?.menu?.locationText}
                    </Text>
                  </Group>
                </Link>
              )}
            </Flex>
          </Center>
        </Stack>
      </BackgroundImage>
      <Stack align="center" justify={"space-between"} h={"55vh"} py={"xl"}>
        <Center>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {(menuLanding?.menuPageEnabled === true ||
              menuLanding?.menuPageEnabled === undefined) && (
              <PaperLayout
                p={"xl"}
                mah={"200px"}
                hoveractive
                c={"var(--grey-color-3)"}
              >
                {MenuButton(largeScreen, menuLanding?.catalogue)}
              </PaperLayout>
            )}
            {menuLanding?.feedbackPageEnabled === true && (
              <PaperLayout
                p={"xl"}
                mah={"200px"}
                hoveractive
                c={"var(--grey-color-3)"}
              >
                {FeedbackButton(largeScreen, menuLanding?.catalogue)}
              </PaperLayout>
            )}
          </SimpleGrid>
        </Center>
        <Group>
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/poweredByRateUp.png`}
            w={"clamp(137px, 4.098rem + 11.905vw, 237px)"}
            alt="rate-up logo"
          />
        </Group>
      </Stack>
    </Stack>
  );
}

function FeedbackButton(largeScreen: boolean, catalogue: boolean) {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  return (
    <Stack align="center" gap={0}>
      <Link
        href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack justify={"space-between"} align={"center"} gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/feedback.png`}
            w={largeScreen ? "79px" : "40px"}
            maw={"104px"}
            h={"auto"}
            alt="feedback image"
          />
          <Text fw={"600"} mt={catalogue ? "20px" : "0"}>
            Feedback
          </Text>
        </Stack>
      </Link>
    </Stack>
  );
}

function MenuButton(largeScreen: boolean, catalogue: boolean) {
  const router = useRouter();
  let imageSrc = catalogue
    ? "/images/menu/catalogue.png"
    : "/images/menu/menu.png";
  return (
    <Stack align="center" gap={0}>
      <Link
        href={`/public/menu/${router.query.menuId}/view`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack justify={"center"} align={"center"} gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}${imageSrc}`}
            w={largeScreen ? (catalogue ? "100%" : "104px") : "52px"}
            h={"auto"}
            mah={"80px"}
            alt="menu image"
          />
          <Text fw={"600"} mt={largeScreen && 18}>
            {catalogue ? "Catalogue" : "Menu"}
          </Text>
        </Stack>
      </Link>
    </Stack>
  );
}
