import { Image } from "@unpic/react";
import dayjs from "dayjs";
import { ExternalLink, Loader2, MapPin, Package, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { axiosClient } from "@/backend/apiClient";
import type {
  CatalogOrderAddress,
  CatalogOrderProduct,
} from "@/backend/whatsapp/catalog/orders/catalogOrders.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { COMMON_CARRIERS, EXCLUDED_KEYS, STAGE_LABELS } from "@/types/enums";
import { getApiErrorMessage } from "@/utils/apiError.ts";

/**
 * What the dialog reads off an order. Both the commerce list's `CommerceOrder`
 * and the catalog's `CatalogOrder` satisfy it.
 */
export interface OrderDetails {
  id: string;
  createdAt: string;
  contact?: { name?: string | null; phone?: string | null } | null;
  products?: CatalogOrderProduct[];
  status?: string | null;
  orderStage?: string | null;
  currency?: string | null;
  shippingAddress?: CatalogOrderAddress | null;
  deliveryOption?: { charge?: number; name?: string; days?: number } | null;
  shopifyDraftOrderId?: string | null;
  shopifyInvoiceUrl?: string | null;
}

/** A Shopify fulfillment order line item, from the integration proxy. */
interface ShopifyFulfillmentLineItem {
  id: string;
  remainingQuantity: number;
  totalQuantity?: number;
  title?: string;
  name?: string;
  sku?: string | null;
  image?: { url?: string } | null;
}

/** A Shopify fulfillment order, from the integration proxy. */
interface ShopifyFulfillmentOrder {
  id: string;
  status?: string;
  lineItems?: { nodes?: ShopifyFulfillmentLineItem[] };
}

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  order: OrderDetails | null;
}) {
  const [fulfillmentOrders, setFulfillmentOrders] = useState<ShopifyFulfillmentOrder[]>([]);
  const [loadingFulfillments, setLoadingFulfillments] = useState(false);
  const [submittingFulfillment, setSubmittingFulfillment] = useState(false);
  const [trackingCompany, setTrackingCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [customCarrierName, setCustomCarrierName] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [quantitiesToFulfill, setQuantitiesToFulfill] = useState<Record<string, number>>({});

  const fetchFulfillmentOrders = async () => {
    if (!order?.id || !order?.shopifyDraftOrderId) return;
    setLoadingFulfillments(true);
    try {
      const response = await axiosClient.get(
        `/integrations/shopify/orders/${order.id}/fulfillment-orders`,
      );
      const fulfillments: ShopifyFulfillmentOrder[] = response.data || [];
      setFulfillmentOrders(fulfillments);
      const initialQtys: Record<string, number> = {};
      fulfillments.forEach((fo) => {
        fo.lineItems?.nodes?.forEach((item) => {
          if (item.remainingQuantity > 0) {
            initialQtys[item.id] = item.remainingQuantity;
          }
        });
      });
      setQuantitiesToFulfill(initialQtys);
    } catch (e) {
      console.error("Failed to fetch fulfillment orders", e);
    } finally {
      setLoadingFulfillments(false);
    }
  };

  useEffect(() => {
    if (open && order?.shopifyDraftOrderId) {
      fetchFulfillmentOrders();
    } else {
      setFulfillmentOrders([]);
    }
  }, [open, order?.id]);

  const handleCreateFulfillment = async (fulfillmentOrderId: string) => {
    const fo = fulfillmentOrders.find((f) => f.id === fulfillmentOrderId);
    if (!fo) return;

    const lineItemsToFulfill = fo.lineItems?.nodes
      ?.map((item) => ({
        id: item.id,
        quantity: quantitiesToFulfill[item.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (!lineItemsToFulfill || lineItemsToFulfill.length === 0) {
      toast.error("Please enter a quantity greater than 0 for at least one item.");
      return;
    }

    setSubmittingFulfillment(true);
    try {
      const payload: {
        lineItemsByFulfillmentOrder: Array<{
          fulfillmentOrderId: string;
          fulfillmentOrderLineItems: Array<{ id: string; quantity: number }>;
        }>;
        notifyCustomer: boolean;
        trackingInfo?: { number?: string; company?: string; url?: string };
      } = {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId,
            fulfillmentOrderLineItems: lineItemsToFulfill,
          },
        ],
        notifyCustomer,
      };

      if (trackingNumber || trackingCompany || trackingUrl) {
        payload.trackingInfo = {
          ...(trackingNumber && { number: trackingNumber }),
          ...(trackingCompany && { company: trackingCompany }),
          ...(trackingUrl && { url: trackingUrl }),
        };
      }

      await axiosClient.post("/integrations/shopify/orders/fulfill", payload);
      toast.success("Fulfillment created successfully!");
      setTrackingNumber("");
      setTrackingCompany("");
      setTrackingUrl("");
      setSelectedCarrier("");
      setCustomCarrierName("");
      await fetchFulfillmentOrders();
    } catch (e) {
      console.error("Failed to create fulfillment", e);
      toast.error(getApiErrorMessage(e, "Failed to create fulfillment in Shopify"));
    } finally {
      setSubmittingFulfillment(false);
    }
  };

  if (!order) return null;

  const products = order.products ?? [];
  const address = order.shippingAddress;
  const delivery = order.deliveryOption;
  const itemsTotal = products.reduce(
    (s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1),
    0,
  );
  const deliveryCharge = delivery?.charge ?? 0;
  const grandTotal = itemsTotal + deliveryCharge;
  const currency = products[0]?.currency ?? "₹";

  const stageLabel =
    (order.orderStage ? STAGE_LABELS[order.orderStage] : undefined) ??
    order.orderStage ??
    order.status ??
    "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <p className="text-sm text-muted-foreground">{order.contact?.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Order Date
            </p>
            <p className="text-sm">
              {order.createdAt ? dayjs(order.createdAt).format("MMMM D, YYYY h:mm A") : "—"}
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
              {products.map((item, idx: number) => {
                const price = Number(item.price) || 0;
                const qty = Number(item.quantity) || 1;
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
                          if (k === "additional_variant_attributes" && typeof v === "object" && v) {
                            return Object.entries(v).map(([kk, vv]) => (
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
              <span className="text-muted-foreground">Delivery ({delivery.name})</span>
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
              {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
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
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Shopify Order</p>
              </div>
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

            {order.shopifyDraftOrderId && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Shopify Fulfillment</span>
                    {loadingFulfillments && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {loadingFulfillments ? (
                  <div className="rounded-lg border p-4 bg-muted/10 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading fulfillment status from Shopify...
                  </div>
                ) : fulfillmentOrders.length === 0 ? (
                  <div className="rounded-lg border p-4 bg-muted/10 text-sm text-muted-foreground">
                    No active fulfillment orders found. Make sure the draft order is completed and
                    paid in Shopify.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fulfillmentOrders.map((fo) => {
                      const unfulfilledItems =
                        fo.lineItems?.nodes?.filter((item) => item.remainingQuantity > 0) || [];
                      const isFulfilled = fo.status === "FULFILLED";

                      return (
                        <div key={fo.id} className="rounded-lg border p-4 bg-muted/5 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-muted-foreground mr-1">
                                Fulfillment Order ID:
                              </span>
                              <code className="font-mono text-[10px] bg-background px-1 py-0.5 rounded">
                                {fo.id.split("/").pop()}
                              </code>
                            </div>
                            <Badge variant={isFulfilled ? "default" : "secondary"}>
                              {fo.status}
                            </Badge>
                          </div>

                          <div className="text-sm space-y-2">
                            {fo.lineItems?.nodes?.map((item) => {
                              const hasRemaining = item.remainingQuantity > 0;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                                >
                                  <div>
                                    <p className="font-medium text-xs">{item.title}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      SKU: {item.sku || "N/A"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Total:</span>{" "}
                                      {item.totalQuantity}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Remaining:</span>{" "}
                                      {item.remainingQuantity}
                                    </div>
                                    {hasRemaining && (
                                      <div className="flex items-center gap-1.5 ml-2">
                                        <span className="text-[10px] text-muted-foreground">
                                          Fulfill:
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          max={item.remainingQuantity}
                                          value={quantitiesToFulfill[item.id] ?? 0}
                                          onChange={(e) => {
                                            const val = Math.min(
                                              item.remainingQuantity,
                                              Math.max(0, parseInt(e.target.value) || 0),
                                            );
                                            setQuantitiesToFulfill((prev) => ({
                                              ...prev,
                                              [item.id]: val,
                                            }));
                                          }}
                                          className="w-12 h-6 border rounded text-center px-1 font-mono text-[11px] bg-background"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {unfulfilledItems.length > 0 && (
                            <div className="pt-2 space-y-3">
                              <Separator />
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Tracking Details
                              </p>
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">
                                      Carrier / Company
                                    </label>
                                    <select
                                      value={selectedCarrier}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedCarrier(val);
                                        if (val === "Custom") {
                                          setTrackingCompany(customCarrierName);
                                        } else {
                                          setTrackingCompany(val);
                                        }
                                      }}
                                      className="w-full h-8 text-xs border rounded px-2 bg-background"
                                    >
                                      <option value="">Select carrier...</option>
                                      {COMMON_CARRIERS.map((c) => (
                                        <option key={c} value={c}>
                                          {c}
                                        </option>
                                      ))}
                                      <option value="Custom">Custom / Other</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">
                                      Tracking Number
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. DEL123456"
                                      value={trackingNumber}
                                      onChange={(e) => setTrackingNumber(e.target.value)}
                                      className="w-full h-8 text-xs border rounded px-2 bg-background"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-muted-foreground">
                                      Tracking URL
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="https://..."
                                      value={trackingUrl}
                                      onChange={(e) => setTrackingUrl(e.target.value)}
                                      className="w-full h-8 text-xs border rounded px-2 bg-background"
                                    />
                                  </div>
                                </div>

                                {selectedCarrier === "Custom" && (
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-3 space-y-1">
                                      <label className="text-[10px] text-muted-foreground">
                                        Custom Carrier Name
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g. My Local Delivery Partner"
                                        value={customCarrierName}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setCustomCarrierName(val);
                                          setTrackingCompany(val);
                                        }}
                                        className="w-full h-8 text-xs border rounded px-2 bg-background"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={notifyCustomer}
                                    onChange={(e) => setNotifyCustomer(e.target.checked)}
                                    className="rounded border-gray-300"
                                  />
                                  Notify customer
                                </label>

                                <button
                                  type="button"
                                  disabled={submittingFulfillment}
                                  onClick={() => handleCreateFulfillment(fo.id)}
                                  className="h-8 px-4 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded flex items-center justify-center disabled:opacity-50"
                                >
                                  {submittingFulfillment ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                      Fulfilling...
                                    </>
                                  ) : (
                                    "Fulfill Selected Items"
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
