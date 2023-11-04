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
import { IconMapPin } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import classes from "./Feedback.module.css";
import { getMenuPublicById } from "../../../../../backend/menu/menu.api";
import { Data } from "../../../../../types/global";
import Link from "next/link";

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
  const fallbackImageBackround = "/images/menu/background.jpg";
  const largeScreen = useMediaQuery("(min-width: 40em)");

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
    ? getFileUrlFromKey(backgroundImage)
    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${fallbackImageBackround}`;
  return (
    <Container fluid h={"100vh"} px={0} c={"white"}>
      <BackgroundImage src={bgSrc} w={"100%"} h={"100%"}>
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
                      fz={menuLanding?.headerStyle?.fontSize || "30px"}
                      fw={menuLanding?.headerStyle?.fontWeight ?? "bold"}
                      ff={menuLanding?.headerStyle?.fontFamily}
                      c={menuLanding?.headerStyle?.color ?? "inherit"}
                    >
                      {menuLanding?.headerText ?? "Welcome To"}
                    </Text>
                    <Text
                      fz={menuLanding?.titleStyle?.fontSize ?? "max(3vw, 4rem)"}
                      fw={menuLanding?.titleStyle?.fontWeight ?? "bold"}
                      ff={menuLanding?.titleStyle?.fontFamily}
                      c={menuLanding?.titleStyle?.color ?? "inherit"}
                    >
                      {menuLanding?.menu?.displayName}
                    </Text>
                  </Stack>
                  <Group w="100%" justify="center" gap={"50px"}>
                    {menuLanding?.menu?.locationText &&
                      menuLanding?.menu?.locationUrl && (
                        <Link
                          className={classes.hoverEffect}
                          href={menuLanding?.menu?.locationUrl}
                          style={{
                            textDecoration: "none",
                            ...menuLanding?.otherStyle,
                          }}
                          target="_blank"
                        >
                          <Group>
                            <IconMapPin />
                            <Text>{menuLanding?.menu?.locationText}</Text>
                          </Group>
                        </Link>
                      )}
                    {menuLanding?.menu?.websiteText &&
                      menuLanding?.menu?.websiteUrl && (
                        <Link
                          className={classes.base1}
                          href={menuLanding?.menu?.websiteUrl}
                          style={{
                            textDecoration: "none",
                            ...menuLanding?.otherStyle,
                          }}
                          target="_blank"
                        >
                          <Group>
                            <IconMapPin />
                            <Text>{menuLanding?.menu?.websiteText}</Text>
                          </Group>
                        </Link>
                      )}
                  </Group>
                </Stack>
              </Grid.Col>
              <Grid.Col order={largeScreen ? 3 : 2} span={largeScreen ? 3 : 12}>
                {(menuLanding?.feedbackPageEnabled === true ||
                  menuLanding?.feedbackPageEnabled === undefined) && (
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
        <Stack align="center">
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
            maw={"min(200px, 40vw)"}
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
        href={`/public/menu/${router.query.menuId}/view`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Stack align="center">
          <Image
            src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
            maw={"min(200px, 40vw)"}
            h={"auto"}
            alt="feedback image"
          />
          <Text>Menu</Text>
        </Stack>
      </Link>
    </Stack>
  );
}
