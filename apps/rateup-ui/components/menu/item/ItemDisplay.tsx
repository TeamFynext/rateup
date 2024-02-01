import {
  Box,
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
      w={"clamp(300px, 228.576px + 11.905vw, 400px)"}
      mih={"clamp(165px, 47.136px + 2.976vw, 190px)"}
      hoveractive={!(item?.disabled || categoryDisabled)}
      onClick={() =>
        !(item?.disabled || categoryDisabled) && setSelectedItem(item)
      }
    >
      <Flex
        h={"100%"}
        ff={lexend.style.fontFamily}
        style={{ userSelect: "none" }}
      >
        <Group
          style={{
            display: "grid",
            flex: 0.8,
            gridTemplateRows: "auto min-content 16px",
          }}
        >
          <Image
            w={"100%"}
            h={"100%"}
            miw={smallScreen ? "120px" : "164px"}
            maw={smallScreen ? "120px" : "164px"}
            src={
              item?.images?.length > 0
                ? encodeURI(getFileUrlFromKey(item?.images[0]))
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
          />
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
        </Group>

        <Flex
          c={"var(--grey-color)"}
          fw={"600"}
          w={smallScreen ? "134px" : "100%"}
          opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
          style={{
            filter:
              item?.disabled || categoryDisabled
                ? "grayscale(1)"
                : "grayscale(0)",
          }}
        >
          <Stack p={smallScreen ? "10px" : "14px"} gap={0}>
            <Text
              fz="clamp(16px, 13.136px + 0.476vw, 20px)"
              lineClamp={2}
              tt={"capitalize"}
              fw={500}
            >
              {item?.name}
            </Text>
            <ScrollArea
              h={"30px"}
              w={"clamp(100px, 28.576px + 11.905vw, 200px)"}
            >
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
        </Flex>
      </Flex>
    </PaperLayout>
  );
}
