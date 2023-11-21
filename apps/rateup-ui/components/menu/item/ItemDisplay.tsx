import { Flex, Group, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";
import { GilroyMedium, GilroySemibold } from "../../../public/fonts";
import PaperLayout from "../../styled/Layouts/PaperLayout";

interface ItemDisplayProps {
  item: MenuItem;
  setSelectedItem: (item: MenuItem) => void;
}
export function ItemDisplay({ item, setSelectedItem }: ItemDisplayProps) {
  const fallbackImage = `${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/no_image_template.jpeg`;
  const smallScreen = useMediaQuery("(max-width: 40em)");

  return (
    <PaperLayout
      p="0"
      shadow="lg"
      radius="lg"
      mx={smallScreen ? "auto" : "sm"}
      w={"clamp(300px,  14.286rem + 11.905vw, 400px)"}
      h={"clamp(156px, 8.232rem + 4.048vw, 190px)"}
      hoveractive={true}
      onClick={() => setSelectedItem(item)}
    >
      <Flex h={"100%"}>
        <Flex style={{ flex: 0.8 }}>
          <Image
            w={"100%"}
            h={"100%"}
            maw={"300px"}
            src={
              item?.images?.length > 0
                ? getFileUrlFromKey(item?.images[0])
                : fallbackImage
            }
            style={{
              aspectRatio: "4 / 3",
            }}
            variant="gradient"
            fallbackSrc={fallbackImage}
            alt="image of menu item"
          />
        </Flex>

        <Stack style={{ flex: 1 }} c={"var(--grey-color)"} className={GilroySemibold.className}>
          <Stack p={"clamp(0.625rem, 0.268rem + 0.952vw, 1.125rem)"} gap={0}>
            <Text
              fz="clamp(1rem, 0.821rem + 0.476vw, 1.25rem)"
              truncate
              tt={"capitalize"}
            >
              {item?.name}
            </Text>
            <Text
              fz="clamp(0.75rem, 0.616rem + 0.357vw, 0.938rem)"
              c="var(--grey-color-4)"
              lineClamp={3}
              mih={"50px"}
              className={GilroyMedium.className}
            >
              {item?.description}
            </Text>
            <Group
              justify="space-evenly"
              gap={"sm"}
            >
              {item?.price?.variants?.length > 0 ? (
                item?.price?.variants.map((varient, index) => (
                  <Stack align="center" gap={"0px"} key={index}>
                    <Text
                      fz="clamp(0.75rem, 0.616rem + 0.357vw, 0.938rem)"
                      tt={"capitalize"}
                    >
                      {varient?.name}
                    </Text>
                    <Text fz="clamp(0.875rem, 0.696rem + 0.476vw, 1.125rem)">
                      ₹{varient?.price}
                    </Text>
                  </Stack>
                ))
              ) : (
                <Text
                  fz="clamp(0.875rem, 0.696rem + 0.476vw, 1.125rem)"
                  mt={"md"}
                >
                  ₹{item?.price?.price}
                </Text>
              )}
            </Group>
          </Stack>
        </Stack>
      </Flex>
    </PaperLayout>
  );
}
