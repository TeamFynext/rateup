import React, { useCallback, useEffect, useState } from "react";
import { IconCircleCheck, IconX } from "@tabler/icons-react";
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
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { PlanCardWidth, Title4 } from "../Utils/constants";
import ButtonStyles from "./Button.module.css";
import { useDisclosure } from "@mantine/hooks";
import styles from "./Modal.module.css";
import { useRouter } from "next/router";

const PlanCard = ({
  index,
  totalItems,
  mainColor = null,
  currencySymbol,
  data,
  inversePeriod,
  largeScreen,
  handlePlanSelection,
  menuPage = false,
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);
  let cardMainColor = "linear-gradient(90deg, #387adf, #50c4ed)";

  useEffect(() => {
    if (opened) setIsIframeLoading(true);
  }, [opened]);

  const router = useRouter();
  const upadateLoadingStateOfIframe = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  let marginTop = "xl";
  let title = `Subscribe Now`;
  let isPopular = false;

  if ((!menuPage && index === 1) || (menuPage && index === 1)) {
    marginTop = "-12px";
    isPopular = true;
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
                {data?.paymentPlan?.period ? (
                  <>
                    {currencySymbol}
                    <NumberAnimate value={data?.paymentPlan?.amount} />
                    {data?.paymentPlan?.period === "monthly"
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
              onClick={open}
              radius={"xl"}
              size="md"
              className={ButtonStyles["button-hover"]}
            />
          </Center>
        </Stack>
      ) : (
        <Stack justify="space-between" h="100%">
          <Stack ff={lexend300.style.fontFamily} gap={5} p="0" mt={"sm"}>
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
                if (data?.displayName.includes("FREE")) {
                  router.push("/signup");
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
            src="https://rateup.app/public/survey/89421698-e6dd-43ee-9b63-757a7614bed3"
          />
        )}
      </Modal>
    </Card>
  );
};

export default PlanCard;

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
        <>
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

          <Divider my="md" />
        </>
      );
    })}
  </List>
);
