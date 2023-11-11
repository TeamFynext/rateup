import { Card, Grid, Group, Image, Stack, Text } from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";
import { GilroyMedium, GilroyRegular } from "../../../public/fonts";

interface ItemDisplayProps {
  item: MenuItem;
  setSelectedItem: (item: MenuItem) => void;
}
export function ItemDisplay({ item, setSelectedItem }: ItemDisplayProps) {
  const fallbackImage = "/images/no_image_template.jpeg";
  const smallScreen = useMediaQuery("(max-width: 40em)");

  return (
    <Card
      shadow="sm"
      padding="0"
      radius="lg"
      mx={smallScreen ? "auto" : "sm"}
      w={"clamp(300px,  14.286rem + 11.905vw, 400px)"}
      h={"clamp(110px, 4.821rem + 5.476vw, 156px)"}
      onClick={() => setSelectedItem(item)}
    >
      <Grid>
        <Grid.Col span={5.5}>
          <Image
            w={"100%"}
            h={"clamp(110px, 4.821rem + 5.476vw, 156px)"}
            maw={"300px"}
            src={
              item.images.length > 0
                ? getFileUrlFromKey(item.images[0])
                : fallbackImage
            }
            style={{
              aspectRatio: "4 / 3",
            }}
            variant="gradient"
            fallbackSrc={fallbackImage}
            alt="image of menu item"
          />
        </Grid.Col>
        <Grid.Col span={6.5}>
          <Stack p={"clamp(0.625rem, -0.045rem + 1.786vw, 1.563rem)"} gap={0}>
            <Text
              fz="clamp(0.75rem, 0.482rem + 0.714vw, 1.125rem)"
              c="var(--shade-of-brown)"
              truncate
              tt={"capitalize"}
            >
              {item.name}
            </Text>
            <Text
              fz="clamp(0.625rem, 0.491rem + 0.357vw, 0.813rem)"
              c="dimmed"
              lineClamp={3}
              mih={"45px"}
              className={GilroyMedium.className}
            >
              {item.description}
            </Text>
            <Group
              justify="space-evenly"
              gap={"sm"}
              className={GilroyMedium.className}
            >
              {item.price.variants?.length > 0 ? (
                item.price.variants.map((varient, index) => (
                  <Stack align="center" gap={"0px"} key={index}>
                    <Text
                      fz="clamp(0.625rem, 0.491rem + 0.357vw, 0.813rem)"
                      c="dimmed"
                      className={GilroyRegular.className}
                    >
                      {varient.name}
                    </Text>
                    <Text
                      c="var(--shade-of-brown)"
                      fz="clamp(0.5rem, 0.321rem + 0.476vw, 0.75rem)"
                    >
                      ₹{varient.price}
                    </Text>
                  </Stack>
                ))
              ) : (
                <Text
                  c="var(--shade-of-brown)"
                  fz="clamp(0.5rem, 0.321rem + 0.476vw, 0.75rem)"
                  mt={"md"}
                >
                  ₹{item?.price?.price}
                </Text>
              )}
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Card>
  );
}
