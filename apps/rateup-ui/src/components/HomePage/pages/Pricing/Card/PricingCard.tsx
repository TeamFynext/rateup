"use client";

import React, { useCallback, useEffect, useState } from "react";

import {
  Box,
  Card,
  Center,
  Divider,
  List,
  LoadingOverlay,
  Modal,
  rem,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircleCheck, IconX } from "@tabler/icons-react";

import { RateupButtonPrimary } from "../../../../Button/RateupButtons.tsx";
import { NumberAnimate } from "../Animate/NumberAnimate.tsx";
import {
  CardWidth,
  Title1,
  Title2,
  Title3,
  Title4,
} from "../Utils/constants.ts";
import ButtonStyles from "./Button.module.css";
import styles from "./Modal.module.css";

const PricingCard = ({
  index,
  mainColor,
  currencySymbol,
  data,
  inversePeriod,
  largeScreen,
  handlePlanSelection,
  menuPage = false,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  let marginTop = "xl";
  if (!menuPage && index === 1) {
    marginTop = "-8px";
  }
  const title = `Subscribe`;
  // if (menuPage) {
  //   title = index === 0 ? "Buy Rateup Menu" : "Buy Rateup Menu Pro";
  // }
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      w={CardWidth}
      mt={marginTop}
      mih={"clamp(390px, 318.576px + 11.905vw, 490px)"}
    >
      <Card.Section>
        <Box h={22} bg={mainColor} />
      </Card.Section>
      <Stack align="center" mt={"md"}>
        <Text fz={Title4} c={"var(--grey-color)"}>
          {data?.displayName}
        </Text>
      </Stack>
      <Divider
        label={
          index !== 2 && `${currencySymbol} ${data?.inverse}-${inversePeriod}`
        }
        mt={index === 2 && 10}
        labelPosition="center"
      />
      {(menuPage && index === 3) || (!menuPage && index === 2) ? (
        <>
          <Center
            c={mainColor}
            mb={largeScreen ? "xl" : "md"}
            mt={largeScreen ? "lg" : "xs"}
            pb={largeScreen && "5px"}
          >
            <Text fz={"clamp(30px, 25.712px + 0.714vw, 36px)"}>Lets Talk!</Text>
          </Center>
          <Center>
            <RateupButtonPrimary
              title="Contact Sales"
              color={mainColor}
              onClick={open}
              radius={"xl"}
              sx={{
                fontSize: Title4,
                height: Title2,
              }}
              className={ButtonStyles["button-hover"]}
            />
          </Center>
        </>
      ) : (
        <>
          <Center c={mainColor} mb={largeScreen ? "sm" : "xs"}>
            <Text fz={Title1}>
              <sup
                style={{
                  fontSize: Title3,
                }}
              >
                {currencySymbol}
              </sup>
              <NumberAnimate value={data?.paymentPlan?.amount} />
            </Text>
            <Text>/{data?.paymentPlan?.period}</Text>
          </Center>

          <Stack align="center" gap={5} mt={"sm"} mb={"xl"}>
            {generateListItems(data?.description)}
          </Stack>

          <Center>
            <RateupButtonPrimary
              title={title}
              color={mainColor}
              radius={"xl"}
              sx={{
                fontSize: Title4,
                height: Title2,
              }}
              fullWidth
              className={ButtonStyles["button-hover"]}
              onClick={() =>
                handlePlanSelection({
                  id: data?.id,
                  name: data?.displayName,
                  currency: data?.currency,
                  description: data?.description,
                  amount: data?.paymentPlan?.amount,
                  currencySymbol: currencySymbol,
                  period: data?.paymentPlan?.period,
                  planId: data?.paymentPlan?.planId,
                })
              }
            />
          </Center>
        </>
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

export const generateListItems = (listData: string[] = []) => (
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
        <List.Item
          key={item}
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
      );
    })}
  </List>
);
