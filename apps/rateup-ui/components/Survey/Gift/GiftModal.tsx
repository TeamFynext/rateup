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
import { MIN_GIFT_AMOUNT, offerList } from "../../../utils/survey/gift";
import { MIN_AMOUNT_ERROR } from "../../../utils/constants";
import { IconInfoCircle } from "@tabler/icons-react";
import dayjs from "dayjs";

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
  const claimedAll = !invoiceList?.find((invoice) => !invoice.giftRedeemed);
  const isCombineClaim =
    invoiceList?.filter(
      (invoice) =>
        dayjs(invoice.invoiceDate).isBefore(
          new Date("2024-04-12T10:20:19.677Z"),
        ) && invoice.giftRedeemed,
    )?.length > 1
      ? true
      : false;
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
              ta={"center"}
              fz={claimedAll ? 16 : "clamp(16px, 10.288px + 0.952vw, 24px)"}
            >
              {claimedAll ? "your've claimed all invoices" : "CONGRATULATIONS"}
            </Text>
            <Text
              ta={"center"}
              fz={14}
              c={"var(--gift-grey)"}
              ff={lexend400.style.fontFamily}
            >
              Vishukai Nettam gifts are waiting for you. Select an invoice to
              claim now.
            </Text>

            <Stack mt="xs" w={"100%"}>
              {invoiceList?.map((invoice) => {
                let checkDisable = !invoice.giftRedeemed;
                if (invoice.invoiceValue < MIN_GIFT_AMOUNT) {
                  checkDisable = false;
                }
                return (
                  <PaperLayout
                    key={invoice.id}
                    p={0}
                    style={{
                      borderRadius: "12px",
                      filter: checkDisable ? "grayscale(0)" : "grayscale(1)",
                    }}
                    hoveractive={checkDisable}
                    onClick={() => {
                      if (!checkDisable || !invoice.invoiceValue) return;
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
                        c={
                          invoice.giftRedeemed ? "white" : giftThemeObj.false.bg
                        }
                        bg={giftThemeObj[invoice.giftRedeemed?.toString()]?.c}
                        ta={"center"}
                        fz={14}
                        ff={lexend500.style.fontFamily}
                        py={4}
                      >
                        {invoice.invoiceValue < MIN_GIFT_AMOUNT
                          ? MIN_AMOUNT_ERROR
                          : invoice.giftRedeemed
                            ? "Won as Vishukainettam"
                            : "Get myG Vishukainettam"}
                      </Text>
                    </Card>
                  </PaperLayout>
                );
              })}
            </Stack>
            {isCombineClaim && (
              <Group w={"100%"} gap={1}>
                <Text>
                  <IconInfoCircle size={14} />
                </Text>
                <Text size="xs">
                  Previous invoice totals may be combined to gift.
                </Text>
              </Group>
            )}
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
