"use client";

import { useState } from "react";

import {
  Badge,
  Flex,
  Group,
  List,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonSecondary } from "../../../components/Button/RateupButtons";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import NothingFound from "../../../components/NothingFound/NothingFound";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { formatIsoDateString } from "../../../utils/dateTime";
import {
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/notifications";
import classes from "./setting.module.css";

const OrderHistory = ({ orders, refetch, isRefetching }) => {
  const [
    openedOrderDetails,
    { open: openOrderDetails, close: closeOrderDetails },
  ] = useDisclosure(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const translations = useTranslations();
  return (
    <>
      {orders?.length > 0 ? (
        <>
          <Flex justify={"flex-end"} p="sm">
            <RateupButtonSecondary
              title={translations("Refresh")}
              onClick={async () => {
                showLoadingToast(
                  translations("Hold ondata getting updated"),
                  "order-history",
                  true,
                  translations("Refreshing order history"),
                );
                await refetch();
                showSuccessToast(
                  translations("Updated Succesfully"),
                  "order-history",
                  <IconCheck />,
                  true,
                );
              }}
              leftIcon={
                <IconRefresh
                  className={isRefetching ? classes.rotateInfinitely : null}
                  style={{ width: "90%", height: "90%" }}
                  stroke={1.5}
                />
              }
            />
          </Flex>
          <Group
            justify="space-between"
            px={"sm"}
            c={"gray"}
            style={{ marginLeft: "20px" }}
          >
            <Text w={150}>{translations("Order Id")}</Text>
            <Text w={120}>{translations("Billing Date")}</Text>
            <Text w={100}>{translations("Plan")}</Text>
            <Text w={100}>{translations("Amount")}</Text>
            <Text w={120}>{translations("Payment")}</Text>
            <Text w={120}>{translations("Status")}</Text>
          </Group>
          <ScrollArea.Autosize h={"60vh"} scrollbarSize={6}>
            <Stack px={"sm"} gap={0}>
              {orders
                ?.sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((order) => (
                  <>
                    <PaperLayout
                      key={order.id}
                      my={"xs"}
                      onClick={() => {
                        setSelectedOrder(order);
                        openOrderDetails();
                      }}
                      hoveractive
                      style={{ margin: "auto" }}
                    >
                      <Group justify="space-between">
                        <Title order={5} w={170}>
                          {order?.id}
                        </Title>
                        <Title order={5} w={140}>
                          {formatIsoDateString(order?.createdAt)}
                        </Title>
                        <Title order={5} w={120}>
                          {order?.displayName}
                        </Title>
                        <Title order={5} w={120}>
                          {order?.currency === "INR" ? "₹" : "$"}
                          {order?.amount}/-
                        </Title>
                        <Title order={5} w={120}>
                          {order?.paymentMethod
                            ? order.paymentMethod.toUpperCase()
                            : translations("Not available")}
                        </Title>
                        <Title order={5} w={120}>
                          <OrderStatusBadge order={order} />
                        </Title>
                      </Group>
                    </PaperLayout>
                  </>
                ))}
            </Stack>
          </ScrollArea.Autosize>
        </>
      ) : (
        <NothingFound text={translations("No Orders Found")} />
      )}
      <FormModalLayout
        opened={openedOrderDetails}
        onClose={closeOrderDetails}
        title={translations("Order Details")}
        size="xl"
        centered
      >
        <Stack>
          <Group
            py="sm"
            px="lg"
            justify="space-between"
            style={{ background: "var(--light-grey-color)" }}
          >
            <Text>
              {translations("Order Placed")} <br />{" "}
              {formatIsoDateString(selectedOrder?.createdAt)}
            </Text>
            <Text>
              {translations("Total Amount")} <br />{" "}
              {selectedOrder?.currency === "INR" ? "₹" : "$"}{" "}
              {selectedOrder?.amount} /-
            </Text>
            <Stack gap="5px">
              <Text>{translations("Order Id")}</Text>
              <Text size="xs" c="dimmed">
                {selectedOrder?.id}
              </Text>
            </Stack>

            <OrderStatusBadge order={selectedOrder} />
          </Group>
          <Group px="md" pt="sm" justify="space-between">
            <Stack>
              <Title order={3}>
                {" "}
                {selectedOrder?.displayName || "Plan Name"}{" "}
              </Title>
              <Title order={5}>
                {selectedOrder?.currency === "INR" ? "₹" : "$"}{" "}
                {selectedOrder?.amount}/-
              </Title>

              <Group mt="xl">
                <Text fw={500} style={{ minWidth: "150px" }}>
                  {translations("Payment Method :")}
                </Text>
                <Text c="dimmed">
                  {selectedOrder?.paymentMethod
                    ? selectedOrder.paymentMethod.toUpperCase()
                    : translations("Not available")}
                </Text>
              </Group>
              <Group>
                <Text fw={500} style={{ minWidth: "150px" }}>
                  {translations("Payment Status :")}
                </Text>
                <Text c="dimmed">{selectedOrder?.paymentStatus} </Text>
              </Group>
            </Stack>
            <Stack mr="xl">
              <Title order={5}>{translations("Plan Features")} </Title>
              <List>
                {selectedOrder?.planFeatures?.map((feature) => {
                  if (feature.startsWith("-")) return null;
                  else return <List.Item key={feature}>{feature}</List.Item>;
                })}
              </List>
            </Stack>
          </Group>
        </Stack>
      </FormModalLayout>
    </>
  );
};

export default OrderHistory;

export const OrderStatusBadge = ({ order }) => {
  const translations = useTranslations();
  let color, statusText;

  switch (order?.status) {
    case "PENDING":
      if (order?.paymentStatus === "SUCCESS") {
        color = "blue";
        statusText = translations("PROCESSING");
      } else if (order?.paymentStatus === "FAILED") {
        color = "red";
        statusText = translations("FAILED");
      } else {
        color = "yellow";
        statusText = translations(order?.status) || order?.status;
      }
      break;
    case "FAILED":
      color = "red";
      statusText = translations(order?.status) || order?.status;
      break;
    default:
      color = "green";
      statusText = translations(order?.status) || order?.status;
  }

  return (
    <Badge color={color} size="lg">
      {statusText}
    </Badge>
  );
};
