import React from "react";

import {
  Box,
  Card,
  Center,
  Grid,
  Group,
  Image,
  Modal,
  NumberFormatter,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";

import { imagesPath } from "../../HomePage/constants";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { Invoice } from "../../../backend/surveys/survey.api";
import { lexend400, lexend500, lexend600 } from "../../../utils/fonts";
import { offerList } from "../../../utils/survey/gift";

const giftThemeObj = {
  false: {
    bg: "var(--gift-green)",
    c: "white",
  },
  true: {
    bg: "var(--gift-grey-2)",
    c: "var(--gift-black)",
  },
};

type GiftModalProps = {
  invoiceList: Invoice[];
  close: () => void;
  handleInvoiceSubmit: (prop: {
    id: string;
    price: number;
    redeem: boolean;
  }) => void;
  opened: boolean;
};

const GiftModal = ({
  invoiceList,
  close,
  handleInvoiceSubmit,
  opened,
}: GiftModalProps) => {
  const imgLg = 90;
  const imgSm = 80;
  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      radius={"md"}
      size={"auto"}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack align="center" maw={300} pb={"xs"} gap={5} mah={800} mih={400}>
        {invoiceList?.length === 0 ? (
          <Center h={350}>
            <Text
              ta={"center"}
              tt={"capitalize"}
              ff={lexend600.style.fontFamily}
            >
              No Invoice Found for your phone number
            </Text>
          </Center>
        ) : (
          <>
            <Text
              ff={lexend600.style.fontFamily}
              c={"var(--gift-green)"}
              tt={"uppercase"}
              fz={"clamp(16px, 10.288px + 0.952vw, 24px)"}
            >
              CONGRATULATIONS
            </Text>
            <Text
              ta={"center"}
              fz={14}
              c={"var(--gift-grey)"}
              ff={lexend400.style.fontFamily}
            >
              You have rewards for your recent purchases. Claim Now
            </Text>
            <Stack mt="xs" w={"100%"}>
              {invoiceList?.map((invoice) => (
                <PaperLayout
                  key={invoice.id}
                  p={0}
                  style={{
                    borderRadius: "12px",
                    filter: invoice.giftRedeemed
                      ? "grayscale(1)"
                      : "grayscale(0)",
                  }}
                  hoveractive={!invoice.giftRedeemed}
                  onClick={() => {
                    if (invoice.giftRedeemed || !invoice.invoiceValue) return;
                    handleInvoiceSubmit({
                      id: invoice.id,
                      price: invoice.invoiceValue,
                      redeem: invoice.giftRedeemed,
                    });
                    close();
                  }}
                >
                  <Card
                    c={giftThemeObj[invoice.giftRedeemed?.toString()]?.c}
                    style={{
                      background: invoice.giftRedeemed
                        ? giftThemeObj.true.bg
                        : "radial-gradient(110.01% 110.01% at 3.97% 0.99%, var(--gift-green-light) 0%, var(--gift-green) 100%)",
                    }}
                    p={0}
                  >
                    <Grid>
                      <Grid.Col span={5}>
                        <Stack
                          w={imgLg}
                          h={imgLg}
                          justify="center"
                          align="center"
                        >
                          <Image
                            src={getGiftImageUrl(
                              offerList?.[invoice?.gift],
                              invoice.giftRedeemed,
                            )}
                            w={invoice.giftRedeemed ? imgLg : imgSm}
                            h={invoice.giftRedeemed ? imgLg : imgSm}
                            alt="image of gift"
                          />
                        </Stack>
                      </Grid.Col>
                      <Grid.Col span={7}>
                        <Stack>
                          <Group
                            mt={"xs"}
                            c={giftThemeObj.false.bg}
                            bg={giftThemeObj.false.c}
                            style={{
                              borderRadius: ".625rem 0rem 0rem 0rem",
                            }}
                            gap={5}
                            px={"xs"}
                          >
                            <Text fz={8}>Invoice No:</Text>
                            <Text fz={12}>{invoice.invoiceNumber}</Text>
                          </Group>
                          <Box>
                            <Text
                              fz={7}
                              lh={1.2}
                              c={
                                invoice.giftRedeemed
                                  ? "var(--gift-grey-4)"
                                  : "var(--gift-grey-3)"
                              }
                            >
                              Amount
                            </Text>
                            <Text lh={1.2} ff={lexend600.style.fontFamily}>
                              <NumberFormatter
                                prefix="Rs "
                                value={invoice.invoiceValue}
                                thousandSeparator
                              />
                            </Text>
                          </Box>
                        </Stack>
                      </Grid.Col>
                    </Grid>
                    <Text
                      c={invoice.giftRedeemed ? "white" : giftThemeObj.false.bg}
                      bg={giftThemeObj[invoice.giftRedeemed?.toString()]?.c}
                      ta={"center"}
                      fz={14}
                      ff={lexend500.style.fontFamily}
                      py={4}
                    >
                      {invoice.giftRedeemed
                        ? "Won as Vishukainettam"
                        : "Get myG Vishukainettam"}
                    </Text>
                  </Card>
                </PaperLayout>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  );
};

export default GiftModal;

const getGiftImageUrl = (giftKey: string = "", giftClaimed = true) => {
  if (giftClaimed) return `${imagesPath}/offer/${giftKey}`;
  else return `/images/gift_box.png`;
};
