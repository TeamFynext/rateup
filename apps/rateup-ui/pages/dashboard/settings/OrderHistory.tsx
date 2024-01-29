import {
  Badge,
  Divider,
  Group,
  Paper,
  Stack,
  Title,
  Text,
  List,
  ScrollArea,
} from "@mantine/core";
import React, { useEffect } from "react";
import { formatIsoDateString } from "../../../utils/dateTime";

const OrderHistory = ({ orders }) => {
  return (
    <Stack mt="xl" style={{ maxWidth: "1000px" }}>
      <Title order={2} style={{ minWidth: "140px" }} mt="xl">
        Order History :
      </Title>
      <Divider m="0" p="0" />
      {(!orders || orders.length < 1) && (
        <Text m="50px" c="dimmed">
          No orders found..!
        </Text>
      )}
      <ScrollArea h={400} mt="-30px" p="0">
        {orders
          ?.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .map((order) => (
            <Paper
              shadow="xl"
              p="xl"
              mt="md"
              style={{ maxWidth: "1000px" }}
              key={order.id}
            >
              <Stack>
                <Group
                  py="sm"
                  px="lg"
                  justify="space-between"
                  style={{ background: "var(--light-grey-color)" }}
                >
                  <Text>
                    Order Placed <br /> {formatIsoDateString(order?.createdAt)}
                  </Text>
                  <Text>
                    Total Amount <br /> {order?.currency === "INR" ? "₹" : "$"}{" "}
                    {order?.amount} /-
                  </Text>
                  <Stack gap="5px">
                    <Text>Order Id</Text>
                    <Text size="xs" c="dimmed">
                      {order?.id}
                    </Text>
                  </Stack>

                  <OrderStatusBadge order={order} />
                </Group>
                <Group px="md" pt="sm" justify="space-between">
                  <Stack>
                    <Title order={3}>
                      {" "}
                      {order?.displayName || "Plan Name"}{" "}
                    </Title>
                    <Title order={5}>
                      {order?.currency === "INR" ? "₹" : "$"} {order?.amount}/-
                    </Title>

                    <Group mt="xl">
                      <Text fw={500} style={{ minWidth: "150px" }}>
                        Payment Method :
                      </Text>
                      <Text c="dimmed">
                        {order?.paymentMethod
                          ? order.paymentMethod.toUpperCase()
                          : "Not available"}
                      </Text>
                    </Group>
                    <Group>
                      <Text fw={500} style={{ minWidth: "150px" }}>
                        Payment Status :
                      </Text>
                      <Text c="dimmed">{order?.paymentStatus} </Text>
                    </Group>
                  </Stack>
                  <Stack mr="xl">
                    <Title order={5}> Plan Features </Title>
                    <List>
                      {order?.planFeatures?.map((feature) => (
                        <List.Item key={feature}>{feature}</List.Item>
                      ))}
                    </List>
                  </Stack>
                </Group>
              </Stack>
            </Paper>
          ))}
      </ScrollArea>
    </Stack>
  );
};

export default OrderHistory;

export const OrderStatusBadge = ({ order }) => {
  let color, statusText;

  switch (order?.status) {
    case "PENDING":
      if (order?.paymentStatus === "SUCCESS") {
        color = "blue";
        statusText = "PROCESSING";
      } else if (order?.paymentStatus === "FAILED") {
        color = "red";
        statusText = "FAILED";
      } else {
        color = "yellow";
        statusText = order?.status;
      }
      break;
    case "FAILED":
      color = "red";
      statusText = order?.status;
      break;
    default:
      color = "green";
      statusText = order?.status;
  }

  return (
    <Badge color={color} size="lg">
      {statusText}
    </Badge>
  );
};
