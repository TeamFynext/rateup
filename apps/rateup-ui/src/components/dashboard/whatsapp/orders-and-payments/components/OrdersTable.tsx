"use client";

import React, { useState } from "react";

import dayjs from "dayjs";
import { Loader2, Package } from "lucide-react";

import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

import OrderDetailsDialog from "./OrderDetailsDialog.tsx";

const STAGE_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  PENDING_ADDRESS: { label: "Awaiting Address", variant: "outline" },
  PENDING_DELIVERY: { label: "Awaiting Delivery", variant: "outline" },
  PENDING_PAYMENT: { label: "Awaiting Payment", variant: "secondary" },
  PENDING_CHECKOUT: { label: "Checkout Sent", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

function calcTotal(products: any[], deliveryOption?: any): string {
  const items = (products ?? []).reduce(
    (s: number, p: any) =>
      s +
      (parseFloat(p.price ?? "0") || 0) * (parseInt(p.quantity ?? "1") || 1),
    0,
  );
  const delivery = deliveryOption?.charge ?? 0;
  const total = items + delivery;
  if (total === 0) return "—";
  const currency = products?.[0]?.currency ?? "₹";
  return `${currency}${total.toFixed(2)}`;
}

export default function OrdersTable({
  settingId,
  phoneId,
  storeType,
}: {
  settingId: string;
  phoneId?: string;
  storeType?: string;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: connectedCatalog, isLoading: isLoadingCatalog } =
    useConnectedWaCatalog(phoneId);
  const catalogId = connectedCatalog?.catalogId;

  const { data: ordersData, isLoading: isLoadingOrders } = useWaCatalogOrders(
    catalogId,
    { pageIndex: page, pageSize, storeType },
  );

  const orders = ordersData?.data ?? [];
  const totalCount = ordersData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (isLoadingCatalog) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalogId) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center border border-dashed rounded-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          No catalog connected. Orders will appear here once a catalog is linked
          to this WhatsApp number.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingOrders ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: any) => {
                const stageCfg = STAGE_CONFIG[order.orderStage] ?? {
                  label: order.orderStage ?? order.status ?? "—",
                  variant: "outline" as const,
                };
                return (
                  <TableRow
                    key={order.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="text-sm">
                      <div>{dayjs(order.createdAt).format("MMM D, YYYY")}</div>
                      <div className="text-xs text-muted-foreground">
                        {dayjs(order.createdAt).format("h:mm A")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {order.contact?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.contact?.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={stageCfg.variant}
                        className="text-xs whitespace-nowrap"
                      >
                        {stageCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.paymentMethod ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {order.products?.reduce(
                        (a: number, p: any) =>
                          a + (parseInt(p.quantity ?? "1") || 1),
                        0,
                      ) ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {calcTotal(order.products, order.deliveryOption)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount} order{totalCount !== 1 ? "s" : ""} total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0 || isLoadingOrders}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => (p < totalPages - 1 ? p + 1 : p))}
            disabled={page >= totalPages - 1 || isLoadingOrders}
          >
            Next
          </Button>
        </div>
      </div>

      <OrderDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}
