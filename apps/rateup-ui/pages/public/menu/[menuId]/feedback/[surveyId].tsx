import {
  Center,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { IconMapPin, IconWorld } from "@tabler/icons-react";
import { getFileUrlFromKey } from "../../../../../utils/file-upload/upload";
import classes from "./Feedback.module.css";
import { usePublicMenuById } from "../../../../../backend/menu/menu.query";

export default function () {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const { menuId } = useRouter().query as { menuId: string };
  const { data: menu, isLoading: loading, error } = usePublicMenuById(menuId);
  if (!menu) return null;
  if (loading) {
    return <Loader />;
  }
  return (
    <Container
      fluid
      px={largeScreen ? "10vw" : "1vw"}
      py="3vh"
      style={{
        // TODO: add blur to background image
        background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), ${
          menu?.backgroundImage
            ? `url(${getFileUrlFromKey(menu?.backgroundImage)})`
            : ""
        }`,
        backgroundColor: "#121212",
        backgroundSize: "cover",
        height: "100vh",
        color: "white",
      }}
    >
      <Center w="100%" h="100%">
        <Grid align="center" w="100%">
          <Grid.Col order={largeScreen ? 1 : 2} span={largeScreen ? 3 : 6}>
            <MenuButton />
          </Grid.Col>
          <Grid.Col
            span={largeScreen ? 6 : 12}
            order={largeScreen ? 2 : 1}
            mih={menu.logo ? "400px" : "200px"}
          >
            <Stack
              align="center"
              style={{
                padding: largeScreen ? "0 20px 0 20px" : "0",
              }}
            >
              {menu.logo && (
                <img
                  width="100px"
                  height={"100px"}
                  src={getFileUrlFromKey(menu.logo)}
                  style={{
                    borderRadius: "4px",
                  }}
                />
              )}
              <div>
                <Text style={{ textAlign: "center" }}>Welcome To</Text>
                {/* TODO: make this text responsive? (if longer name, smaller font) */}
                <Text
                  style={{ textAlign: "center" }}
                  fz={"max(3vw, 2rem)"}
                  fw="bold"
                >
                  {menu.displayName}
                </Text>
              </div>
              <Group w="100%" justify="center">
                {menu.locationText && menu.locationUrl && (
                  <Group
                    className={classes.hoverEffect}
                    onClick={() => window.open(menu.locationUrl, "_blank")}
                  >
                    <IconMapPin />
                    <Text maw={"80%"}>{menu.locationText}</Text>
                  </Group>
                )}
                {menu.websiteText && menu.websiteUrl && (
                  <Group
                    className={classes.base1}
                    onClick={() => window.open(menu.websiteUrl, "_blank")}
                  >
                    <IconWorld />
                    <Text>{menu.websiteText}</Text>
                  </Group>
                )}
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col order={3} span={largeScreen ? 3 : 6}>
            <FeedbackButton />
          </Grid.Col>
        </Grid>
      </Center>
    </Container>
  );
}

function FeedbackButton() {
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  return (
    <Stack align="center" style={{ cursor: "pointer" }}>
      <img
        onClick={() => {
          router.push(
            `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/survey/${surveyId}`,
          );
        }}
        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/feedback.png`}
        style={{ maxWidth: "min(200px, 40vw)", height: "auto" }}
      />
      <Text>Feedback</Text>
    </Stack>
  );
}

function MenuButton() {
  const router = useRouter();
  function handleClick() {
    router.push(`/public/menu/${router.query.menuId}/view`);
  }
  return (
    <Stack align="center">
      <img
        onClick={handleClick}
        src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/menu/menu.png`}
        style={{
          maxWidth: "min(200px, 40vw)",
          height: "auto",
          cursor: "pointer",
        }}
      />
      <Text onClick={handleClick} style={{ cursor: "pointer" }}>
        Menu
      </Text>
    </Stack>
  );
}
