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
      <Divider />
      {(!orders || orders.length < 1) && (
        <Text m="50px" c="dimmed">
          No orders found..!
        </Text>
      )}
      <ScrollArea h={400}>
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
              style={{ maxWidth: "600px" }}
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
                  <Badge
                    color={order?.status === "PENDING" ? "yellow" : "green"}
                    size="lg"
                  >
                    {order?.status}
                  </Badge>
                </Group>
                <Group px="md" pt="sm" justify="space-between">
                  <Stack>
                    <Title order={3}>
                      {" "}
                      {order?.displayName || "Plan Name"}{" "}
                    </Title>
                    <Title order={5}> {order?.amount}/-</Title>
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
