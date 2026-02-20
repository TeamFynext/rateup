"use client";

import React, { useState } from "react";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";

import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaCatalogOrders } from "@/backend/whatsapp/catalog/orders/catalogOrders.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import OrderDetailsDialog from "./OrderDetailsDialog";

export default function OrdersTable() {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: waSettings } = useWaSettings();
  const phoneId = waSettings?.[0]?.phoneId; // Using the first settings' phoneId for now

  // Fetch connected catalog
  const { data: connectedCatalog, isLoading: isLoadingCatalog } =
    useConnectedWaCatalog(phoneId);
  const catalogId = connectedCatalog?.catalogId;

  // Fetch orders
  const { data: ordersData, isLoading: isLoadingOrders } = useWaCatalogOrders(
    catalogId,
    { pageIndex: page, pageSize },
  );

  const orders = ordersData?.data || [];
  const totalCount = ordersData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleRowClick = (order: any) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  if (isLoadingCatalog) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!catalogId) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-md border-dashed">
        No catalog connected. Orders will appear here once a catalog is linked.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingOrders ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: any) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(order)}
                >
                  <TableCell>
                    {format(new Date(order.createdAt), "MMM d, yyyy")}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), "p")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {order.contact?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.contact?.phone}
                    </div>
                  </TableCell>
                  <TableCell>{order.paymentMethod || "N/A"}</TableCell>
                  <TableCell className="text-center">
                    {order.products?.reduce(
                      (acc: number, p: any) => acc + p.quantity,
                      0,
                    ) || 0}
                  </TableCell>
                  <TableCell className="text-right">{order.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((old) => Math.max(old - 1, 0))}
          disabled={page === 0 || isLoadingOrders}
        >
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setPage((old) => (old < totalPages - 1 ? old + 1 : old))
          }
          disabled={page >= totalPages - 1 || isLoadingOrders}
        >
          Next
        </Button>
      </div>

      <OrderDetailsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        order={selectedOrder}
      />
    </div>
  );
}
