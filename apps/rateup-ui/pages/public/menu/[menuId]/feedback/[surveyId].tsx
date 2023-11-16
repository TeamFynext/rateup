import {
  Center,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Image,
  BackgroundImage,
  Flex,
  Paper,
  SimpleGrid,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import classes from "./Feedback.module.css";
import { getMenuPublicById } from "../../../../../backend/menu/menu.api";
import { Data } from "../../../../../types/global";
import Link from "next/link";
import { GilroyMedium, GilroySemibold } from "../../../../../public/fonts";

type MenuProp = {
  menuId: string;
  surveyId: string;
};

export const getServerSideProps = async (context: { params: MenuProp }) => {
  const params = context.params;

  const menuLanding = await getMenuPublicById(params.menuId);

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
  const fallbackImage = "/images/no_image_template.jpeg";
  const fallbackImageBackround = largeScreen
    ? "/images/menu/background.jpg"
    : "/images/menu/mobileBackground.jpg";
  const backgroundImage = largeScreen
    ? menuLanding?.backgroundImage
    : menuLanding?.mobileBackgroundImage;

  const bgSrc = backgroundImage
    ? getFileUrlFromKey(encodeURI(backgroundImage))
    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${fallbackImageBackround}`;
  return (
    <Stack gap={0} className={GilroySemibold.className}>
      <BackgroundImage
        src={bgSrc}
        radius="sm"
        h={largeScreen ? "50vh" : "40vh"}
        maw={largeScreen ? "2440px" : "768px"}
        bgsz={"cover"}
        bgp={"center"}
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
              ff={menuLanding?.headerStyle?.fontFamily}
              c={menuLanding?.headerStyle?.color ?? "inherit"}
              tt={"capitalize"}
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
              ff={menuLanding?.titleStyle?.fontFamily}
              c={menuLanding?.titleStyle?.color ?? "inherit"}
              ta={"center"}
              tt={"uppercase"}
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
                      fz={"clamp(0.625rem, 0.179rem + 1.19vw, 1.25rem)"}
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
                      fz={"clamp(0.625rem, 0.179rem + 1.19vw, 1.25rem)"}
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
      <Stack align="center" justify={"space-between"} h={"50vh"} py={"xl"}>
        <Center>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {(menuLanding?.menuPageEnabled === true ||
              menuLanding?.menuPageEnabled === undefined) && (
              <Paper
                shadow="sm"
                radius={"md"}
                p={"xl"}
                mah={"200px"}
                mx={largeScreen ? "lg" : "0"}
              >
                {MenuButton(largeScreen)}
              </Paper>
            )}
            {(menuLanding?.feedbackPageEnabled === true ) && (
              <Paper
                shadow="sm"
                radius={"md"}
                p={"xl"}
                mah={"200px"}
                mx={largeScreen ? "lg" : "0"}
              >
                {FeedbackButton(largeScreen)}
              </Paper>
            )}
          </SimpleGrid>
        </Center>
        <Group>
          <Text
            className={GilroyMedium.className}
            fz={"clamp(0.875rem, 0.607rem + 0.714vw, 1.25rem)"}
          >
            powered by
          </Text>
          <Image
            src={"/images/rateup_logo.svg"}
            h={"clamp(46.888px, 30.576px + 2.738vw, 70px)"}
            w={"clamp(82.988px, 56.576px + 4.405vw, 120px)"}
            alt="rate-up logo"
          />
        </Group>
      </Stack>
    </Stack>
  );
}

function FeedbackButton(largeScreen: boolean) {
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
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
            w={largeScreen ? "79px" : "40px"}
            maw={"104px"}
            h={"auto"}
            alt="feedback image"
          />
          <Text className={GilroySemibold.className}>Feedback</Text>
        </Stack>
      </Link>
    </Stack>
  );
}

function MenuButton(largeScreen: boolean) {
  const router = useRouter();

  return (
    <Stack align="center" gap={0}>
      <Link
        href={`/public/menu/${router.query.menuId}/view`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack justify={"center"} align={"center"} gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
            w={largeScreen ? "104px" : "52px"}
            h={"auto"}
            alt="menu image"
          />
          <Text className={GilroySemibold.className} mt={largeScreen && 18}>
            Menu
          </Text>
        </Stack>
      </Link>
    </Stack>
  );
}
