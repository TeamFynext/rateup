import React, { useCallback, useEffect, useState } from "react";
import { IconCircleCheck } from "@tabler/icons-react";
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
import { lexend300 } from "../../../../../utils/fonts";
import { NumberAnimate } from "../Animate/NumberAnimate";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import { CardWidth, Title1, Title2, Title3, Title4 } from "../Utils/constants";
import ButtonStyles from "./Button.module.css";
import { useDisclosure } from "@mantine/hooks";
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
  let title = `Buy ${data.displayName}`;
  if (menuPage) {
    title = index === 0 ? "Buy Rateup Menu" : "Buy Rateup Menu Pro";
  }
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
      {index === 2 ? (
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
          <Center c={mainColor} mb={largeScreen ? "lg" : "xs"}>
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
          <Center>
            <RateupButtonPrimary
              title={title}
              color={mainColor}
              radius={"xl"}
              sx={{
                fontSize: Title4,
                height: Title2,
              }}
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
          <Stack
            align="center"
            ff={lexend300.style.fontFamily}
            gap={5}
            mt={"xl"}
          >
            {generateListItems(data?.description)}
          </Stack>
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
            src="https://rateup.app/public/survey/89421698-e6dd-43ee-9b63-757a7614bed3"
          />
        )}
      </Modal>
    </Card>
  );
};

export default PricingCard;
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
    {listData?.map((item) => <List.Item key={item}>{item}</List.Item>)}
  </List>
);
