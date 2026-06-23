"use client";

import React, { useCallback, useEffect, useState } from "react";

import {
  Box,
  Card,
  Center,
  Divider,
  Group,
  List,
  LoadingOverlay,
  Modal,
  rem,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircleCheck, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { gAnalyticsAndFbEvent } from "@/utils/gtag.ts";

import { RateupButtonPrimary } from "../../../../Button/RateupButtons.tsx";
import { NumberAnimate } from "../Animate/NumberAnimate.tsx";
import { PlanCardWidth, Title4 } from "../Utils/constants.ts";
import ButtonStyles from "./Button.module.css";
import styles from "./Modal.module.css";

const PlanCard = ({
  index,
  totalItems,
  mainColor = null,
  currencySymbol,
  data,
  inversePeriod,
  largeScreen,
  handlePlanSelection,
  isPopular = false,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  const [isStripe, setIsStripe] = useState(false);
  let cardMainColor = "linear-gradient(90deg, #387adf, #50c4ed)";

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  useEffect(() => {
    if (data?.stripeProduct?.amount) {
      setIsStripe(true);
    }
  }, [data]);

  const navigate = useNavigate();
  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  let marginTop = "xl";
  const title = `Subscribe Now`;

  if (isPopular) {
    marginTop = "-12px";
    cardMainColor = "linear-gradient(90deg, #004F98, #387ADF)";
  }

  return (
    <Card
      shadow="md"
      radius="lg"
      withBorder
      w={PlanCardWidth}
      mt={marginTop}
      mih={"100%"}
      style={{
        zIndex: 3,
        borderTopLeftRadius: isPopular ? "0px" : "15px",
        borderTopRightRadius: isPopular ? "0px" : "15px",
      }}
    >
      <Card.Section>
        <Box m="xs" bg={cardMainColor} style={{ borderRadius: "5px" }}>
          <Stack m={"md"} pt="sm" pb="md" gap={0}>
            <Text fz={Title4} c={"white"}>
              {data?.displayName}
            </Text>

            <Group>
              <Text size={"lg"} fw={500} c={"white"}>
                {data?.paymentPlan?.period || data?.stripeProduct?.interval ? (
                  <>
                    {currencySymbol}
                    <NumberAnimate
                      value={
                        data?.paymentPlan?.amount ||
                        data?.stripeProduct?.amount ||
                        0
                      }
                    />
                    {(
                      !isStripe
                        ? data?.paymentPlan?.period === "monthly"
                        : data?.stripeProduct?.interval === "month"
                    )
                      ? " / month"
                      : " / year"}
                  </>
                ) : (
                  "Customized Plan & Pricing"
                )}
              </Text>
            </Group>
          </Stack>
        </Box>
      </Card.Section>
      {totalItems - 1 === index ? (
        <Stack justify="space-around" h="100%">
          <Center
            c={cardMainColor}
            mb={largeScreen ? "xl" : "md"}
            mt={largeScreen ? "lg" : "xs"}
            pb={largeScreen && "5px"}
            h="80%"
          >
            <Text fz={"clamp(30px, 25.712px + 0.714vw, 36px)"}>Lets Talk!</Text>
          </Center>
          <Center mb="lg">
            <RateupButtonPrimary
              title="Contact Sales"
              color={cardMainColor}
              onClick={() => {
                gAnalyticsAndFbEvent(
                  "contact_sales",
                  "ContactSalesButtonClick",
                  "Clicked on Contact Sales button in the pricing page",
                );
                open();
              }}
              radius={"xl"}
              size="md"
              className={ButtonStyles["button-hover"]}
            />
          </Center>
        </Stack>
      ) : (
        <Stack justify="space-between" h="100%">
          <Stack gap={5} p="0" mt={"sm"}>
            {generateListItems(data?.description)}
          </Stack>

          <Center mb="lg">
            <RateupButtonPrimary
              title={title}
              color={cardMainColor}
              radius={"xl"}
              className={ButtonStyles["button-hover"]}
              size="md"
              onClick={() => {
                gAnalyticsAndFbEvent(
                  "subscribe_pricing",
                  "SubscribeNowButtonClick",
                  "Clicked on subscribe now button in the pricing page",
                );
                if (data?.displayName.includes("FREE")) {
                  if (data?.name?.includes("MENU")) {
                    localStorage.setItem("selected_plan", JSON.stringify(data));
                  }
                  navigate({
                    to: "/signup",
                  });
                } else {
                  handlePlanSelection({
                    id: data?.id,
                    name: data?.displayName,
                    currency: data?.currency,
                    description: data?.description,
                    amount: data?.paymentPlan
                      ? data?.paymentPlan?.amount
                      : data?.stripeProduct?.amount,
                    currencySymbol: currencySymbol,
                    period: data?.paymentPlan
                      ? data?.paymentPlan?.period
                      : data?.stripeProduct?.interval,
                    gateway: data?.paymentPlan ? "RAZORPAY" : "STRIPE",
                    planId: data?.paymentPlan ? data?.paymentPlan?.planId : "",
                    priceId: data?.paymentPlan
                      ? ""
                      : data?.stripeProduct?.priceId,
                  });
                }
              }}
            />
          </Center>
        </Stack>
      )}
      <Modal
        opened={opened}
        classNames={styles}
        onClose={close}
        zIndex={400}
        title={"Contact Sales"}
        centered
        size={"100vw"}
        closeOnClickOutside={false}
      >
        <LoadingOverlay
          visible={isIframeLoading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        {opened && (
          <iframe
            onLoad={upadateLoadingStateOfIframe}
            className={styles["contact-form-iframe"]}
            src="https://rateup.app/ws/8hKp9bb9"
          />
        )}
      </Modal>
    </Card>
  );
};

export default PlanCard;

const generateListItems = (listData: string[] = []) => (
  <List
    spacing="xs"
    size="md"
    center
    icon={
      <IconCircleCheck
        style={{ width: rem(16), height: rem(16), color: "green" }}
      />
    }
  >
    {listData.map((item) => {
      const isNegative = item.startsWith("-");
      const displayName = isNegative ? item.substring(1) : item;
      return (
        <Stack key={item} gap={2}>
          <List.Item
            icon={
              isNegative && (
                <IconX
                  style={{ width: rem(16), height: rem(16), color: "red" }}
                />
              )
            }
          >
            {displayName}
          </List.Item>

          <Divider my="md" />
        </Stack>
      );
    })}
  </List>
);
