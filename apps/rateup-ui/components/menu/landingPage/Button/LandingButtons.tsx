import { Image, Stack, Text } from "@mantine/core";

export function FeedbackButton(largeScreen: boolean) {
  return (
    <Stack justify={"space-between"} align={"center"} gap={0}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/feedback.png`}
        w={largeScreen ? "40px" : "20px"}
        maw={"40px"}
        h={"auto"}
        alt="feedback image"
      />
      <Text>Feedback</Text>
    </Stack>
  );
}

export function MenuButton(largeScreen: boolean) {
  return (
    <Stack justify={"center"} align={"center"} gap={0}>
      <Image
        src={`${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/menu/menu.png`}
        w={largeScreen ? "52px" : "26px"}
        h={"auto"}
        alt="menu image"
      />
      <Text mt={largeScreen && 8}>Menu</Text>
    </Stack>
  );
}
