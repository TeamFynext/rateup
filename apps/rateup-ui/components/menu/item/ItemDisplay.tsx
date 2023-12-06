import {
  Center,
  Flex,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";
import PaperLayout from "../../styled/Layouts/PaperLayout";

interface ItemDisplayProps {
  item: any;
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
      h={"clamp(165px, 9.196rem + 2.976vw, 190px)"}
      hoveractive={!item?.disabled}
      onClick={() => !item?.disabled && setSelectedItem(item)}
    >
      <Flex h={"100%"}>
        <SimpleGrid style={{ flex: 0.8 }} pos={"relative"}>
          <Image
            w={"100%"}
            h={"100%"}
            maw={"300px"}
            miw={smallScreen && "109px"}
            src={
              item?.images?.length > 0
                ? getFileUrlFromKey(item?.images[0])
                : fallbackImage
            }
            style={{
              aspectRatio: "4 / 3",
              backgroundColor: "var(--orange-400)",
              position: "absolute",
            }}
            opacity={item?.disabled ? 0.5 : 1}
            fallbackSrc={fallbackImage}
          />
          {item?.disabled && (
            <Center h={"100%"} pos={"relative"}>
              <Paper
                fz={smallScreen ? "xs" : "md"}
                c={"var(--orange-400)"}
                fw={600}
                w={"max-content"}
                radius={"sm"}
                px={"sm"}
                py={5}
              >
                Not Available
              </Paper>
            </Center>
          )}
        </SimpleGrid>

        <Stack
          style={{ flex: 1 }}
          c={"var(--grey-color)"}
          fw={"600"}
          miw={smallScreen && "134px"}
          opacity={item?.disabled ? 0.5 : 1}
        >
          <Stack p={"clamp(0.625rem, 0.268rem + 0.952vw, 1.125rem)"} gap={0}>
            <Text
              fz="clamp(1rem, 0.821rem + 0.476vw, 1.25rem)"
              lineClamp={2}
              tt={"capitalize"}
              fw={500}
            >
              {item?.name}
            </Text>
            <Text
              fz="clamp(0.75rem, 0.616rem + 0.357vw, 0.938rem)"
              lineClamp={3}
              mih={"50px"}
            >
              {item?.description}
            </Text>
            <Group justify="space-evenly" gap={"sm"}>
              {item?.price?.variants?.length > 0 ? (
                item?.price?.variants.map((varient, index) => (
                  <Stack align="center" gap={"0px"} key={index}>
                    <Text
                      fz="clamp(0.75rem, 0.616rem + 0.357vw, 0.938rem)"
                      tt={"capitalize"}
                    >
                      {varient?.name}
                    </Text>
                    <Text
                      fz="clamp(0.875rem, 0.696rem + 0.476vw, 1.125rem)"
                      fw={500}
                    >
                      {varient?.price}
                    </Text>
                  </Stack>
                ))
              ) : (
                <Text
                  fz="clamp(0.875rem, 0.696rem + 0.476vw, 1.125rem)"
                  mt={"sm"}
                  fw={500}
                >
                  {item?.price?.price}
                </Text>
              )}
            </Group>
          </Stack>
        </Stack>
      </Flex>
    </PaperLayout>
  );
}
