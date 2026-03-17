"use client";

import {
  Box,
  Card,
  Center,
  Flex,
  Grid,
  Image,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useExtracted } from "next-intl";

import classes2 from "@/app/m/[shortId]/gradientAnimation.module.css";

import { fallbackImage } from "../../../utils/constants";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { CreditsCard } from "../../Card/CreditsCard";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import MenuFoodLabelBadge from "../category/tag/MenuFoodLabelBadge";
import { currencyLabel } from "../util/currencyData";
import classes from "./ItemDisplay.module.css";

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
  const translations = useExtracted();
  return (
    <PaperLayout
      p="0"
      shadow="lg"
      radius="lg"
      mx={{ base: "auto", sm: "sm" }}
      w={{ base: "100%", sm: "clamp(300px, 228.576px + 11.905vw, 400px)" }}
      maw={400}
      hoveractive={!(item?.disabled || categoryDisabled)}
      onClick={() =>
        !(item?.disabled || categoryDisabled) && setSelectedItem(item)
      }
    >
      <Card radius="md" p={0}>
        <Grid>
          <Grid.Col span={5} pr={0} display={"grid"}>
            <CreditsCard
              // enableCredits={
              //   item?.unsplashImage?.find((data) => data === item?.images[0])
              //     ?.length > 0
              // }
              // disabled for now
              enableCredits={false}
              url={item?.images[0]}
              sx={{
                gridArea: "1 / 1 / 4 / 2",
              }}
            >
              <Image
                src={
                  item?.images?.length > 0 &&
                  encodeURI(
                    getFileUrlFromKey(
                      item?.images[0],
                      true,
                      item?.unsplashImage?.find(
                        (data) => data === item?.images[0],
                      )?.length > 0,
                    ),
                  )
                }
                mih={{ base: "165", sm: "215" }}
                alt="image of menu item"
                opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
                className={classes2.gradient2}
                style={{
                  filter:
                    item?.disabled || categoryDisabled
                      ? "grayscale(1)"
                      : "grayscale(0)",
                }}
                fallbackSrc={fallbackImage}
              />
            </CreditsCard>
            {(item?.disabled || categoryDisabled) && (
              <Center h={"100%"} style={{ gridArea: "1 / 1 / 4" }}>
                <Paper
                  fz={{ base: "xs", sm: "md" }}
                  c={"var(--orange-400)"}
                  fw={600}
                  w={"max-content"}
                  radius={"sm"}
                  p={5}
                  style={{
                    zIndex: 1,
                  }}
                >
                  {translations("Not Available")}
                </Paper>
              </Center>
            )}
          </Grid.Col>
          <Grid.Col span={7}>
            <Box
              c="var(--text-color-sp)"
              w={"100%"}
              opacity={item?.disabled || categoryDisabled ? 0.5 : 1}
              style={{
                filter:
                  item?.disabled || categoryDisabled
                    ? "grayscale(1)"
                    : "grayscale(0)",
              }}
              h={"100%"}
            >
              <Stack gap={0} h={"100%"}>
                <Box>
                  <Text
                    lineClamp={2}
                    className={classes.title}
                    mih={{ base: "auto", sm: 40 }}
                  >
                    {item?.name}
                  </Text>
                  <ScrollArea h={"30px"} w={200} mt={4}>
                    <Flex gap={4}>
                      <MenuFoodLabelBadge
                        foodLabels={item?.foodLabels ?? []}
                        p={"5px"}
                        label={false}
                      />
                    </Flex>
                  </ScrollArea>
                </Box>
                <Stack h={"100%"} justify="space-between" gap={0}>
                  <Text fz={14} className={classes.description} lineClamp={2}>
                    {item?.description}
                  </Text>
                  <Flex justify="space-evenly" gap={"sm"} mt={4}>
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
                          <Text
                            fz="clamp(14px, 11.136px + 0.476vw, 18px)"
                            fw={500}
                          >
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
                      <Text fz="clamp(14px, 11.136px + 0.476vw, 18px)" fw={500}>
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
              </Stack>
            </Box>
          </Grid.Col>
        </Grid>
      </Card>
    </PaperLayout>
  );
}
