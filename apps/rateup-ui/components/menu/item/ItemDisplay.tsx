import {
  BackgroundImage,
  Center,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { lexend } from "../../../utils/fonts";
import { currencyLabel } from "../util/currencyData";
import { fallbackImage } from "../../../utils/constants";

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
      <Flex h={"100%"} ff={lexend.style.fontFamily}>
        <Group style={{ display: "flex", flex: 0.8 }}>
          <BackgroundImage
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
              aspectRatio: "4 / 3",
              backgroundColor: "var(--orange-400)",
            }}
            opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
          >
            {item?.disabled ||
              (categoryDisabled && (
                <Center h={"100%"}>
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
              ))}
          </BackgroundImage>
        </Group>

        <Flex
          c={"var(--grey-color)"}
          fw={"600"}
          w={smallScreen ? "134px" : "100%"}
          opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
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
            <Text
              fz="clamp(12px, calc(9.856px + 0.357vw), 15px)"
              lineClamp={3}
              mih={item?.price?.variants?.length > 0 ? "65px" : "70px"}
            >
              {item?.description}
            </Text>
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
                          {currencyLabel[currency]?.symbol}&nbsp;
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
                      {currencyLabel[currency]?.symbol}&nbsp;
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
