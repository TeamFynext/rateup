import {
  Center,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Image,
  BackgroundImage,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import classes from "./Feedback.module.css";
import { getMenuPublicById } from "../../../../../backend/menu/menu.api";
import { Data } from "../../../../../types/global";
import Link from "next/link";
import { GilroySemibold } from "../../../../../public/fonts";

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
  const fallbackImage = "/images/no_image_template.jpeg";
  const largeScreen = useMediaQuery("(min-width: 40em)");
  const fallbackImageBackround = largeScreen
    ? "/images/menu/background.jpg"
    : "/images/menu/mobileBackground.jpg";

  if (!menuLanding || !menuLanding?.menu?.isPublished)
    return (
      <Stack align="center" h="50vh" justify="space-around">
        <Text size="xl" c="red" fw="600">
          Menu is not available..!
        </Text>
      </Stack>
    );
  const backgroundImage = largeScreen
    ? menuLanding?.backgroundImage
    : menuLanding?.mobileBackgroundImage;

  const bgSrc = backgroundImage
    ? getFileUrlFromKey(encodeURI(backgroundImage))
    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${fallbackImageBackround}`;

  return (
    <Container fluid h={"100vh"} px={0} className={GilroySemibold.className}>
      <BackgroundImage
        src={bgSrc}
        w={"100%"}
        h={"100%"}
        maw={largeScreen ? "2440px" : "768px"}
      >
        <Stack h={"100vh"} justify={"space-between"}>
          <div></div>
          <Stack>
            <Grid align="center" w="100%">
              <Grid.Col order={largeScreen ? 1 : 2} span={largeScreen ? 3 : 12}>
                {(menuLanding?.menuPageEnabled === true ||
                  menuLanding?.menuPageEnabled === undefined) && <MenuButton />}
              </Grid.Col>
              <Grid.Col
                span={largeScreen ? 6 : 12}
                order={largeScreen ? 2 : 1}
                mih={largeScreen && menuLanding?.menu?.logo ? "400px" : "200px"}
              >
                <Stack
                  align="center"
                  justify="space-between"
                  h={"100%"}
                  style={{
                    padding: largeScreen ? "0 20px 0 20px" : "0",
                  }}
                >
                  {menuLanding?.menu?.logo && (
                    <Image
                      src={getFileUrlFromKey(menuLanding?.menu?.logo)}
                      h={100}
                      w={100}
                      maw={100}
                      radius={"md"}
                      fallbackSrc={fallbackImage}
                      alt="menuLanding logo"
                    />
                  )}
                  <Stack align="center">
                    <Text
                      fz={
                        menuLanding?.headerStyle?.fontSize
                          ? largeScreen
                            ? menuLanding?.headerStyle?.fontSize
                            : menuLanding?.headerStyle?.fontSize * 0.6
                          : "30px"
                      }
                      fw={menuLanding?.headerStyle?.fontWeight ?? "bold"}
                      ff={menuLanding?.headerStyle?.fontFamily}
                      c={menuLanding?.headerStyle?.color ?? "inherit"}
                      tt={"capitalize"}
                      truncate
                    >
                      {menuLanding?.headerText ?? "Welcome To"}
                    </Text>
                    <Text
                      fz={
                        menuLanding?.titleStyle?.fontSize
                          ? largeScreen
                            ? menuLanding?.titleStyle?.fontSize
                            : menuLanding?.titleStyle?.fontSize * 0.6
                          : "clamp(35px,3vw, 4rem)"
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
                  <Group w="100%" justify="center" gap={"50px"}>
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
                          <IconMapPin />
                          <Text>{menuLanding?.menu?.locationText}</Text>
                        </Group>
                      </Link>
                    )}
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
                          <IconWorld />
                          <Text>{menuLanding?.menu?.websiteText}</Text>
                        </Group>
                      </Link>
                    )}
                  </Group>
                </Stack>
              </Grid.Col>
              <Grid.Col order={largeScreen ? 3 : 2} span={largeScreen ? 3 : 12}>
                {(menuLanding?.feedbackPageEnabled === true ||
                  menuLanding?.feedbackPageEnabled !== undefined) && (
                  <FeedbackButton />
                )}
              </Grid.Col>
            </Grid>
          </Stack>
          <Center w="100%" pb={"lg"}>
            <Image
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/rateup_logo.svg`}
              h={54}
              w={94}
              alt="rateup-logo"
              fallbackSrc={fallbackImage}
            />
          </Center>
        </Stack>
      </BackgroundImage>
    </Container>
  );
}

function FeedbackButton() {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  return (
    <Stack align="center">
      <Link
        href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack align="center" gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
            w={"clamp(8.125rem, 4.107rem + 10.714vw, 13.75rem)"}
            maw={"220px"}
            h={"auto"}
            alt="feedback image"
          />
          <Text>Feedback</Text>
        </Stack>
      </Link>
    </Stack>
  );
}

function MenuButton() {
  const router = useRouter();
  return (
    <Stack align="center">
      <Link
        href={`/public/menu/${router.query.menuId}/view?feedback=${router.query.surveyId}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack align="center" gap={0}>
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
            w={"clamp(8.125rem, 4.107rem + 10.714vw, 13.75rem)"}
            maw={"220px"}
            h={"auto"}
            alt="feedback image"
          />
          <Text>Menu</Text>
        </Stack>
      </Link>
    </Stack>
  );
}
