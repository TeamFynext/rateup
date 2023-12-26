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
import { lexend300 } from "../../../../../utils/fonts";
import Head from "next/head";

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
      ff={lexend300.style.fontFamily}
    >
      <Head>
        <title>{`Rateup - Welcome to ${menuLanding?.menu?.displayName}`}</title>

        <meta
          name="description"
          content={`This is the menu of ${menuLanding?.menu?.displayName}`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Rateup" />
        <meta
          property="og:url"
          content={`https://rateup.app/public/menu/${menuLanding?.menu?.id}`}
        />
        <meta
          property="og:title"
          content={`Rateup - Welcome to ${menuLanding?.menu?.displayName}`}
        />
        <meta
          property="og:description"
          content={`This is the menu of ${menuLanding?.menu?.displayName}`}
        />
        <meta
          property="og:image"
          content="https://djd7kjh9uwow0.cloudfront.net/images/rateup_logo.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1086" />
        <meta property="og:image:height" content="832" />
        <meta property="og:image:alt" content="Star Icon" />
      </Head>
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
          aspectRatio: "16 / 6",
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
                  ? `clamp(15.008px, 5.008px + 1.667vw, ${menuLanding?.headerStyle?.fontSize}px)`
                  : "clamp(15.008px, 5.008px + 1.667vw, 29.008px)"
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
                  ? `clamp(27.008px, -10.864px + 6.31vw,${menuLanding?.titleStyle?.fontSize}px )`
                  : "clamp(27.008px, -10.864px + 6.31vw,52px )"
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
                      fz={"clamp(13.008px, 8px + 0.833vw, 20px)"}
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
                      fz={"clamp(13.008px, 8px + 0.833vw, 20px)"}
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
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup-credits.svg`}
            w={"clamp(137px, 65.568px + 11.905vw, 237px)"}
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
