"use client";

import React from "react";

import { Image } from "@unpic/react";
import { format } from "date-fns";
import { ExternalLink, MapPin, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

const EXCLUDED_KEYS = new Set([
  "retailerId",
  "currency",
  "price",
  "quantity",
  "title",
  "image",
  "image_link",
  "name",
  "description",
  "availability",
  "condition",
  "visibility",
  "url",
]);
const STAGE_LABELS: Record<string, string> = {
  PENDING_ADDRESS: "Awaiting Address",
  PENDING_DELIVERY: "Awaiting Delivery",
  PENDING_PAYMENT: "Awaiting Payment",
  PENDING_CHECKOUT: "Checkout Sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  order: any;
}) {
  if (!order) return null;

  const products: any[] = order.products ?? [];
  const address: any = order.shippingAddress;
  const delivery: any = order.deliveryOption;
  const itemsTotal = products.reduce(
    (s, p) =>
      s + (parseFloat(p.price ?? 0) || 0) * (parseInt(p.quantity ?? 1) || 1),
    0,
  );
  const deliveryCharge = delivery?.charge ?? 0;
  const grandTotal = itemsTotal + deliveryCharge;
  const currency = products[0]?.currency ?? "₹";

  const stageLabel =
    STAGE_LABELS[order.orderStage] ?? order.orderStage ?? order.status ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        {/* Customer + meta */}
        <div className="grid grid-cols-2 gap-4 py-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Customer
            </p>
            <p className="font-medium">{order.contact?.name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">
              {order.contact?.phone}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Order Date
            </p>
            <p className="text-sm">
              {order.createdAt
                ? format(new Date(order.createdAt), "PPP p")
                : "—"}
            </p>
            <Badge variant="outline" className="mt-1.5">
              {stageLabel}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Products */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[64px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((item: any, idx: number) => {
                const price = parseFloat(item.price ?? "0") || 0;
                const qty = parseInt(item.quantity ?? "1") || 1;
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.image ? (
                        <div className="relative h-12 w-12 rounded overflow-hidden border">
                          <Image
                            src={item.image}
                            alt={item.title || "Product"}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.title || `Product ${item.retailerId}`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        {Object.entries(item).map(([k, v]) => {
                          if (EXCLUDED_KEYS.has(k)) return null;
                          if (
                            k === "additional_variant_attributes" &&
                            typeof v === "object" &&
                            v
                          ) {
                            return Object.entries(v as any).map(([kk, vv]) => (
                              <span key={kk} className="capitalize">
                                {kk.replace(/_/g, " ")}: {String(vv)}
                              </span>
                            ));
                          }
                          if (typeof v === "object") return null;
                          return (
                            <span key={k} className="capitalize">
                              {k.replace(/_/g, " ")}: {String(v)}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{qty}</TableCell>
                    <TableCell className="text-right text-sm">
                      {item.currency ?? currency}
                      {price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.currency ?? currency}
                      {(price * qty).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground">Items subtotal</span>
            <span>
              {currency}
              {itemsTotal.toFixed(2)}
            </span>
          </div>
          {delivery && (
            <div className="flex gap-8">
              <span className="text-muted-foreground">
                Delivery ({delivery.name})
              </span>
              <span>
                {currency}
                {deliveryCharge.toFixed(2)}
              </span>
            </div>
          )}
          <Separator className="w-40" />
          <div className="flex gap-8 font-semibold">
            <span>Grand Total</span>
            <span>
              {currency}
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Shipping address */}
        {address && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Shipping Address</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-0.5">
              <p>
                {address.first_name} {address.last_name}
              </p>
              {address.phone && (
                <p className="text-muted-foreground">{address.phone}</p>
              )}
              <p>{address.address1}</p>
              {address.address2 && <p>{address.address2}</p>}
              <p>
                {address.city}, {address.province} {address.zip}
              </p>
              {address.country_code && <p>{address.country_code}</p>}
            </div>
          </div>
        )}

        {/* Delivery option */}
        {delivery && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Delivery Partner</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-sm flex items-center justify-between">
              <span className="font-medium">{delivery.name}</span>
              <div className="flex gap-3 text-muted-foreground text-xs">
                {delivery.days && <span>Est. {delivery.days} days</span>}
                <span className="font-medium text-foreground">
                  {currency}
                  {deliveryCharge.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Shopify */}
        {(order.shopifyDraftOrderId || order.shopifyInvoiceUrl) && (
          <div>
            <p className="text-sm font-semibold mb-2">🛍️ Shopify Order</p>
            <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
              {order.shopifyDraftOrderId && (
                <p className="text-muted-foreground">
                  Draft Order ID:{" "}
                  <code className="font-mono text-xs bg-background px-1 rounded">
                    {order.shopifyDraftOrderId}
                  </code>
                </p>
              )}
              {order.shopifyInvoiceUrl && (
                <a
                  href={order.shopifyInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  Open Checkout Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
