import { IconExternalLink, IconShoppingBag } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type {
  CatalogOrder,
  CatalogOrderProduct,
} from "@/backend/whatsapp/catalog/orders/catalogOrders.api";
import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { createSortableHeader, DataTable } from "@/components/Table/data-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { PAGE_SIZE } from "@/utils/constants.ts";

/** An order row, with the contact's phone and name flattened for sorting and filtering. */
type CatalogOrderRow = CatalogOrder & { phone: string; name: string };

const CatalogOrders = ({ catalogId }: { catalogId: string }) => {
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
  const [selectedOrder, setSelectedOrder] = useState<CatalogOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const data: CatalogOrderRow[] = useMemo(() => {
    return orders
      ? orders?.data?.map((order: CatalogOrder) => ({
          ...order,
          phone: order.contact.phone,
          name: order.contact.name,
        }))
      : [];
  }, [orders]);

  const columns: ColumnDef<CatalogOrderRow>[] = [
    {
      header: () => "Created At",
      accessorKey: "createdAt",
      id: "createdAt",
      cell: (info) => dayjs(info.getValue() as string).format("DD/MM/YYYY hh:mm A"),
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
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedOrder(info.row.original);
              setIsModalOpen(true);
            }}
          >
            Details
          </Button>
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
            Checkout Link <IconExternalLink className="w-3 h-3" />
          </a>
        );
      },
    },
  ];

  const { totalPrice, productItems } = useMemo(() => {
    let productItems: Array<{
      id: string;
      retailerId: string;
      quantity: number;
      price: string;
      total: string;
    }> = [];
    let totalPrice = 0;
    if (selectedOrder) {
      productItems = selectedOrder.products.map((item: CatalogOrderProduct, idx: number) => ({
        id: `product-${idx}`,
        retailerId: item.retailerId,
        quantity: item.quantity,
        price: `${item.currency} ${item.price}`,
        total: `${item.currency} ${item.price * item.quantity}`,
      }));
      selectedOrder.products.forEach((item: CatalogOrderProduct) => {
        totalPrice += item.price * item.quantity;
      });
    }
    return { productItems, totalPrice, productColumnsData: productItems };
  }, [selectedOrder]);

  type ProductRow = (typeof productItems)[0];

  const productColumns: ColumnDef<ProductRow>[] = [
    {
      id: "retailerId",
      header: createSortableHeader("Retailer ID"),
      cell: ({ row }) => row.original.retailerId,
    },
    {
      id: "quantity",
      header: createSortableHeader("Quantity"),
      cell: ({ row }) => row.original.quantity,
    },
    {
      id: "price",
      header: createSortableHeader("Price"),
      cell: ({ row }) => row.original.price,
    },
    {
      id: "total",
      header: createSortableHeader("Total"),
      cell: ({ row }) => row.original.total,
    },
  ];

  if (error) return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;

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
              <IconShoppingBag className="w-5 h-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Order placed: </span>
                {dayjs(selectedOrder?.createdAt).format("DD/MM/YYYY hh:mm A")}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Order ID: </span>
                {selectedOrder?.id}
              </p>
              {selectedOrder?.shopifyInvoiceUrl && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Shopify Checkout: </span>
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
            <DataTable columns={productColumns} data={productItems} />
            <p className="font-semibold text-lg mt-2">
              Grand Total: {selectedOrder?.products?.[0]?.currency} {totalPrice.toFixed(2)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogOrders;
