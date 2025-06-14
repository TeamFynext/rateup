import { useMemo, useState } from "react";

import {
  Card,
  CardSection,
  Divider,
  Modal,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TableLayoutSecondary from "@/components/styled/Table/TableLayoutSecondary";
import TanstackTable from "@/components/Table/TanstackTable";
import { PAGE_SIZE } from "@/utils/constants";

const CatalogOrders = ({ catalogId }) => {
  const [pagination, setPagination] = useState({
    pageSize: Number(PAGE_SIZE[0]),
    pageIndex: 0,
  });
  const {
    data: orders,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useWaCatalogOrders(catalogId, pagination).get;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const data = useMemo(() => {
    return orders
      ? orders?.data?.map((order) => ({
          ...order,
          phone: order.contact.phone,
          name: order.contact.name,
        }))
      : [];
  }, [orders]);
  const columns: ColumnDef<any>[] = [
    {
      header: () => "Created At",
      accessorKey: "createdAt",
      id: "createdAt",
      cell: (info) =>
        dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
    },
    {
      header: () => "Phone Number",
      accessorKey: "phone",
      id: "phone",
      cell: (info) => info.getValue(),
    },
    {
      header: () => "Name",
      accessorKey: "name",
      id: "name",
      cell: (info) => info.getValue(),
    },
    {
      header: () => "Details",
      accessorFn: (row) => row,
      id: "products",
      cell: (info) => {
        return (
          <RateupButtonSecondary
            variant="light"
            title="Details"
            onClick={() => {
              setSelectedOrder(info.getValue());
              open();
            }}
          />
        );
      },
    },
    {
      header: () => "Order status",
      accessorKey: "status",
      id: "status",
      cell: (info) => info.getValue(),
    },
    {
      header: () => "Payment Method",
      accessorKey: "paymentMethod",
      id: "paymentMethod",
      cell: (info) => info.getValue(),
    },
    {
      header: () => "Payment Status",
      accessorKey: "paymentStatus",
      id: "paymentStatus",
      cell: (info) => info.getValue(),
    },
    {
      header: () => "Transaction ID",
      accessorKey: "transactionId",
      id: "transactionId",
      cell: (info) => info.getValue(),
    },
  ];

  const { totalPrice, productItems } = useMemo(() => {
    let productItems,
      totalPrice = 0;
    if (selectedOrder) {
      productItems = selectedOrder.products.map((item) => {
        totalPrice += item.price * item.quantity;
        return {
          retailerId: item.retailerId,
          quantity: item.quantity,
          price: `${item.currency} ${item.price}`,
          total: `${item.currency} ${item.price * item.quantity}`,
        };
      });
    }
    return { productItems, totalPrice };
  }, [selectedOrder]);
  const productItemsColumns = [
    { key: "retailerId", value: "Retailer ID" },
    { key: "quantity", value: "Quantity" },
    { key: "price", value: "Price" },
    { key: "total", value: "Total" },
  ];

  if (error)
    return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;

  return (
    <Stack>
      <TanstackTable
        data={data}
        columns={columns}
        totalCount={orders?.totalCount}
        isPending={isPending}
        pagination={pagination}
        setPagination={setPagination}
      />
      <Modal opened={opened} onClose={close} centered>
        <Stack>
          <Text size="sm" c="dimmed">
            <Text component="span" c="black">
              Order placed:{" "}
            </Text>
            {dayjs(selectedOrder?.createdAt).format("DD/MM/YYYY hh:mm A")}
          </Text>
          <Text size="sm" c="dimmed">
            <Text component="span" c="black">
              Order ID:{" "}
            </Text>
            {selectedOrder?.id}
          </Text>
          <Divider />
          <Text fw={500}>Items Ordered</Text>
          <TableLayoutSecondary
            columns={productItemsColumns}
            rows={productItems}
          />
          <Text fw={600}>
            Grand Total: {selectedOrder?.products?.[0]?.currency} {totalPrice}
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default CatalogOrders;
