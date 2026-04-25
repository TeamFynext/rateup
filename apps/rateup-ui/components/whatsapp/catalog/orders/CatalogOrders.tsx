"use client";

import { useMemo, useState } from "react";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { ExternalLink, ShoppingBag } from "lucide-react";

import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import TableLayoutSecondary from "@/components/styled/Table/TableLayoutSecondary";
import { DataTable } from "@/components/Table/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
  } = useWaCatalogOrders(catalogId, pagination);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              setIsModalOpen(true);
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
    {
      header: () => "Shopify Link",
      accessorKey: "shopifyInvoiceUrl",
      id: "shopifyInvoiceUrl",
      cell: (info) => {
        const url = info.getValue() as string;
        if (!url) return "-";
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
          >
            Checkout Link <ExternalLink className="w-3 h-3" />
          </a>
        );
      },
    },
  ];

  const { totalPrice, productItems } = useMemo(() => {
    let productItems = [];
    let totalPrice = 0;
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
    <div className="flex flex-col gap-4 relative">
      <DataTable
        data={data}
        columns={columns}
        isPending={isPending}
        serverSide={{
          pagination,
          onPaginationChange: setPagination,
          rowCount: orders?.totalCount || 0,
        }}
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">
                  Order placed:{" "}
                </span>
                {dayjs(selectedOrder?.createdAt).format("DD/MM/YYYY hh:mm A")}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">Order ID: </span>
                {selectedOrder?.id}
              </p>
              {selectedOrder?.shopifyInvoiceUrl && (
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">
                    Shopify Checkout:{" "}
                  </span>
                  <a
                    href={selectedOrder.shopifyInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Open Link
                  </a>
                </p>
              )}
            </div>
            <Separator />
            <p className="font-medium">Items Ordered</p>
            <TableLayoutSecondary
              columns={productItemsColumns}
              rows={productItems}
            />
            <p className="font-semibold text-lg mt-2">
              Grand Total: {selectedOrder?.products?.[0]?.currency}{" "}
              {totalPrice.toFixed(2)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogOrders;
