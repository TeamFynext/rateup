import {
  Box,
  Card,
  Center,
  Flex,
  Group,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { fallbackImage } from "../../../utils/constants";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { lexend } from "../../../utils/fonts";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { currencyLabel } from "../util/currencyData";
import { CreditsCard } from "../../Card/CreditsCard";
interface ItemDisplayProps {
  readonly item: any;
  readonly setSelectedItem: (item: MenuItem) => void;
  readonly categoryDisabled: boolean;
  readonly currency: string;
}
export function ItemDisplay({
  item,
  setSelectedItem,
  categoryDisabled = false,
  currency = "0",
}: ItemDisplayProps) {
  const smallScreen = useMediaQuery("(max-width: 40em)");
  return (
    <PaperLayout
      p="0"
      shadow="lg"
      radius="lg"
      mx={smallScreen ? "auto" : "sm"}
      w={smallScreen ? "100%" : "clamp(300px, 228.576px + 11.905vw, 400px)"}
      maw={400}
      hoveractive={!(item?.disabled || categoryDisabled)}
      onClick={() =>
        !(item?.disabled || categoryDisabled) && setSelectedItem(item)
      }
    >
      <Card radius="md" p={0} ff={lexend.style.fontFamily}>
        <Group wrap="nowrap" gap={0} pos={"relative"}>
          <Box
            h={215}
            style={{
              display: "grid",
            }}
          >
            <CreditsCard
              enableCredits={
                item?.unsplashImage?.find((data) => data === item?.images[0])
                  ?.length > 0
              }
              url={item?.images[0]}
              sx={{
                gridArea: "1 / 1 / 4 / 2",
              }}
            >
              <Image
                w={"100%"}
                h={"100%"}
                miw={120}
                maw={"164px"}
                alt="image of menu item"
                src={
                  item?.images?.length > 0
                    ? encodeURI(
                        getFileUrlFromKey(
                          item?.images[0],
                          true,
                          item?.unsplashImage?.find(
                            (data) => data === item?.images[0],
                          )?.length > 0,
                        ),
                      )
                    : fallbackImage
                }
                style={{
                  backgroundColor: "var(--orange-400)",
                  gridArea: "1 / 1 / 4 / 2",
                  filter:
                    item?.disabled || categoryDisabled
                      ? "grayscale(1)"
                      : "grayscale(0)",
                }}
                opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
                fallbackSrc={fallbackImage}
              />
            </CreditsCard>
            {(item?.disabled || categoryDisabled) && (
              <Center h={"100%"} style={{ gridArea: "1 / 1 / 4" }}>
                <Paper
                  fz={smallScreen ? "xs" : "md"}
                  c={"var(--orange-400)"}
                  fw={600}
                  w={"max-content"}
                  radius={"sm"}
                  px={"sm"}
                  py={5}
                  style={{
                    zIndex: 1,
                  }}
                >
                  Not Available
                </Paper>
              </Center>
            )}
          </Box>
          <Box
            c={"var(--grey-color)"}
            fw={"600"}
            w={"100%"}
            maw={"180px"}
            opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
            style={{
              filter:
                item?.disabled || categoryDisabled
                  ? "grayscale(1)"
                  : "grayscale(0)",
            }}
          >
            <Stack pl={10} gap={0}>
              <Text
                fz="clamp(16px, 13.136px + 0.476vw, 20px)"
                lineClamp={2}
                tt={"capitalize"}
                fw={500}
              >
                {item?.name}
              </Text>
              <ScrollArea h={"30px"} w={200}>
                <Flex gap={4}>
                  <MenuFoodLabelBadge
                    foodLabels={item?.foodLabels ?? []}
                    p={"5px"}
                    label={false}
                  />
                </Flex>
              </ScrollArea>
              <Box mih={item?.price?.variants?.length > 0 ? "65px" : "70px"}>
                <Text
                  fz="clamp(12px, calc(9.856px + 0.357vw), 15px)"
                  lineClamp={3}
                >
                  {item?.description}
                </Text>
              </Box>
              <Flex justify="space-evenly" gap={"sm"}>
                {item?.price?.variants?.length > 0 ? (
                  item?.price?.variants.map((varient, index) => (
                    <Stack align="center" gap={"0px"} key={index}>
                      <Text
                        fz="clamp(12px, 9.856px + 0.357vw, 15.008px)"
                        tt={"capitalize"}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {varient?.name}
                      </Text>
                      <Text fz="clamp(14px, 11.136px + 0.476vw, 18px)" fw={500}>
                        {varient?.price && (
                          <>
                            {currencyLabel[currency]?.symbol}
                            {varient?.price}
                          </>
                        )}
                      </Text>
                    </Stack>
                  ))
                ) : (
                  <Text
                    fz="clamp(14px, 11.136px + 0.476vw, 18px)"
                    mt={"sm"}
                    fw={500}
                  >
                    {item?.price?.price && (
                      <>
                        {currencyLabel[currency]?.symbol}
                        {item?.price?.price}
                      </>
                    )}
                  </Text>
                )}
              </Flex>
            </Stack>
          </Box>
        </Group>
      </Card>
    </PaperLayout>
  );
}
