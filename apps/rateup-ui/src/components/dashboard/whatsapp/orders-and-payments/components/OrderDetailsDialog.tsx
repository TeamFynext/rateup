import React from "react";

import { Image } from "@unpic/react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: OrderDetailsDialogProps) {
  if (!order) return null;

  const products = order.products || [];
  const contact = order.contact;

  const calculateTotal = () => {
    return products.reduce((acc: number, item: any) => {
      // price might be "100 INR" or just number
      const price = parseFloat(item.price); // simplistic parsing, might need regex if "100 INR"
      return acc + (isNaN(price) ? 0 : price) * item.quantity;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">
              Customer
            </h4>
            <p className="font-medium">{contact?.name || "Unknown"}</p>
            <p className="text-sm text-muted-foreground">{contact?.phone}</p>
          </div>
          <div className="text-right">
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">
              Order Date
            </h4>
            <p>
              {order.createdAt
                ? format(new Date(order.createdAt), "PPP p")
                : "-"}
            </p>
            <Badge variant="outline" className="mt-2">
              {order.status}
            </Badge>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((item: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>
                    {item.image ? (
                      <div className="relative h-12 w-12 rounded overflow-hidden border">
                        <Image
                          src={item.image}
                          alt={item.title || "Product"}
                          layout="fullWidth"
                          aspectRatio={1}
                          objectFit="cover"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No Img
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.title || `Product ${item.retailerId}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      {Object.entries(item).map(([key, value]) => {
                        if (
                          [
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
                          ].includes(key)
                        ) {
                          return null;
                        }

                        if (
                          key === "additional_variant_attributes" &&
                          typeof value === "object" &&
                          value !== null
                        ) {
                          return Object.entries(value).map(([k, v]) => (
                            <span key={k} className="capitalize">
                              {k.replace(/_/g, " ")}: {String(v)}
                            </span>
                          ));
                        }

                        if (typeof value === "object") return null;

                        return (
                          <span key={key} className="capitalize">
                            {key.replace(/_/g, " ")}: {String(value)}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.price} {item.currency}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Try to clean price string for calculation display if needed */}
                    {item.price}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
