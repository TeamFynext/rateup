import {
  Badge,
  Group,
  Stack,
  Title,
  Text,
  List,
  ScrollArea,
} from "@mantine/core";
import { useState } from "react";
import { formatIsoDateString } from "../../../utils/dateTime";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import NothingFound from "../../../components/NothingFound/NothingFound";

const OrderHistory = ({ orders }) => {
  const [
    openedOrderDetails,
    { open: openOrderDetails, close: closeOrderDetails },
  ] = useDisclosure(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  return (
    <>
      {orders?.length > 0 ? (
        <>
          <Group justify="space-between" px={"sm"} c={"gray"}>
            <Text w={170}>Order Id</Text>
            <Text w={120}>Billing Date</Text>
            <Text w={170}>Plan</Text>
            <Text w={120}>Amount</Text>
            <Text w={120}>Payment</Text>
            <Text w={120}>Status</Text>
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
                    >
                      <Group justify="space-between">
                        <Title order={5} w={170}>
                          {order?.id}
                        </Title>
                        <Title order={5} w={120}>
                          {formatIsoDateString(order?.createdAt)}
                        </Title>
                        <Title order={5} w={170}>
                          {order?.displayName}
                        </Title>
                        <Title order={5} w={120}>
                          {order?.currency === "INR" ? "₹" : "$"}
                          {order?.amount}/-
                        </Title>
                        <Title order={5} w={120}>
                          {order?.paymentMethod
                            ? order.paymentMethod.toUpperCase()
                            : "Not available"}
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
        <NothingFound text="No Orders Found" />
      )}
      <FormModalLayout
        opened={openedOrderDetails}
        onClose={closeOrderDetails}
        title={"Order Details"}
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
              Order Placed <br />{" "}
              {formatIsoDateString(selectedOrder?.createdAt)}
            </Text>
            <Text>
              Total Amount <br />{" "}
              {selectedOrder?.currency === "INR" ? "₹" : "$"}{" "}
              {selectedOrder?.amount} /-
            </Text>
            <Stack gap="5px">
              <Text>Order Id</Text>
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
                  Payment Method :
                </Text>
                <Text c="dimmed">
                  {selectedOrder?.paymentMethod
                    ? selectedOrder.paymentMethod.toUpperCase()
                    : "Not available"}
                </Text>
              </Group>
              <Group>
                <Text fw={500} style={{ minWidth: "150px" }}>
                  Payment Status :
                </Text>
                <Text c="dimmed">{selectedOrder?.paymentStatus} </Text>
              </Group>
            </Stack>
            <Stack mr="xl">
              <Title order={5}> Plan Features </Title>
              <List>
                {selectedOrder?.planFeatures?.map((feature) => (
                  <List.Item key={feature}>{feature}</List.Item>
                ))}
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
