"use client";

import React, { useEffect, useState } from "react";

import {
  Banknote,
  Building2,
  CreditCard,
  ExternalLink,
  HandHelping,
  Info,
  Landmark,
  Loader2,
  MapPin,
  Save,
  ShoppingBag,
  Smartphone,
  Truck,
} from "lucide-react";

import {
  useCatalogSettings,
  useUpdateCatalogSettings,
} from "@/backend/whatsapp/catalog/catalog.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// ─── Shopify payment options ─────────────────────────────────────────────────
const SHOPIFY_METHODS = [
  {
    id: "shopify_checkout",
    icon: ExternalLink,
    iconBg: "bg-green-100 dark:bg-green-950",
    iconColor: "text-green-600",
    label: "Shopify Checkout URL",
    desc: "Customer receives a Shopify cart link to complete address, delivery, and payment directly on your store.",
    logos: [
      { src: "/images/visa.svg", alt: "Visa" },
      { src: "/images/mastercard.svg", alt: "Mastercard" },
      { src: "/images/rupay.svg", alt: "RuPay" },
    ],
    badges: [],
    collectAddressApplicable: false,
    collectDeliveryApplicable: false,
  },
  {
    id: "shopify_native",
    icon: Smartphone,
    iconBg: "bg-indigo-100 dark:bg-indigo-950",
    iconColor: "text-indigo-600",
    label: "WhatsApp Native Payment",
    desc: "Customer submits address and delivery inside WhatsApp, then pays directly via WhatsApp Pay. Orders sync to Shopify.",
    logos: [
      { src: "/images/gpay.svg", alt: "GPay" },
      { src: "/images/phonepe.svg", alt: "PhonePe" },
      { src: "/images/upi.svg", alt: "UPI" },
    ],
    badges: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
];

// ─── Standard payment options ────────────────────────────────────────────────
const STANDARD_METHODS = [
  {
    id: "manual",
    icon: HandHelping,
    iconBg: "bg-slate-100 dark:bg-slate-900",
    iconColor: "text-slate-600",
    label: "Manual",
    desc: "Customer receives an order summary. Your team contacts them to arrange payment manually.",
    logos: [],
    badges: [],
    fields: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
  {
    id: "upi",
    icon: CreditCard,
    iconBg: "bg-violet-100 dark:bg-violet-950",
    iconColor: "text-violet-600",
    label: "UPI Payment Link",
    desc: "Customer receives an instant UPI payment link for the total order amount.",
    logos: [
      { src: "/images/gpay.svg", alt: "GPay" },
      { src: "/images/phonepe.svg", alt: "PhonePe" },
      { src: "/images/upi.svg", alt: "UPI" },
    ],
    badges: [],
    fields: [
      { key: "upiId", label: "UPI ID", placeholder: "yourstore@upi" },
      { key: "upiDisplayName", label: "Display Name", placeholder: "My Store" },
    ],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
  {
    id: "cod",
    icon: Banknote,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600",
    label: "Cash on Delivery",
    desc: "Customer receives an order confirmation and pays upon delivery.",
    logos: [],
    badges: [
      {
        label: "Cash",
        className:
          "border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400 font-bold",
      },
    ],
    fields: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
  {
    id: "bank",
    icon: Landmark,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600",
    label: "Bank Transfer",
    desc: "Customer receives bank account details to transfer funds and verify payment.",
    logos: [],
    badges: [
      {
        label: "IMPS",
        className:
          "border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400 font-bold",
      },
      {
        label: "NEFT",
        className:
          "border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 font-bold",
      },
    ],
    fields: [
      { key: "holderName", label: "Account Holder", placeholder: "John Doe" },
      {
        key: "accountNumber",
        label: "Account Number",
        placeholder: "1234567890",
      },
      { key: "ifsc", label: "IFSC Code", placeholder: "HDFC0001234" },
      { key: "bankName", label: "Bank Name", placeholder: "HDFC Bank" },
    ],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
  {
    id: "native",
    icon: Smartphone,
    iconBg: "bg-indigo-100 dark:bg-indigo-950",
    iconColor: "text-indigo-600",
    label: "WhatsApp Native Payment",
    desc: "Customer completes checkout and pays directly inside WhatsApp via WhatsApp Pay.",
    logos: [
      { src: "/images/gpay.svg", alt: "GPay" },
      { src: "/images/phonepe.svg", alt: "PhonePe" },
      { src: "/images/upi.svg", alt: "UPI" },
    ],
    badges: [],
    fields: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
];

function CollectToggles({
  collectAddress,
  collectDelivery,
  onAddressChange,
  onDeliveryChange,
  addressApplicable,
  deliveryApplicable,
  hasApprovedFlow,
  fixedDeliveryCharge,
  fixedDeliveryAmount,
  onFixedChargeChange,
  onFixedAmountChange,
}: {
  collectAddress: boolean;
  collectDelivery: boolean;
  onAddressChange: (v: boolean) => void;
  onDeliveryChange: (v: boolean) => void;
  addressApplicable: boolean;
  deliveryApplicable: boolean;
  hasApprovedFlow: boolean;
  fixedDeliveryCharge: boolean;
  fixedDeliveryAmount: number;
  onFixedChargeChange: (v: boolean) => void;
  onFixedAmountChange: (v: number) => void;
}) {
  if (!addressApplicable && !deliveryApplicable) return null;
  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Collection Options
      </p>
      {addressApplicable && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Collect Shipping Address</p>
              <p className="text-xs text-muted-foreground">
                Send a WhatsApp Flow form to collect the customer's address.
                {!hasApprovedFlow && (
                  <span className="text-amber-500">
                    {" "}
                    ⚠️ Requires an approved address flow (see Address Fields
                    tab).
                  </span>
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={collectAddress}
            onCheckedChange={onAddressChange}
            disabled={!hasApprovedFlow}
          />
        </div>
      )}
      {deliveryApplicable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Add Delivery Charge</p>
                <p className="text-xs text-muted-foreground">
                  Enable delivery charges for catalog orders. Price is added to
                  the total.
                </p>
              </div>
            </div>
            <Switch
              checked={collectDelivery}
              onCheckedChange={onDeliveryChange}
            />
          </div>

          {collectDelivery && (
            <div className="ml-6 space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium">
                    Fixed Delivery Charge (Skip Customer Selection)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically apply a fixed delivery charge without asking
                    the customer to select a delivery partner.
                  </p>
                </div>
                <Switch
                  checked={fixedDeliveryCharge}
                  onCheckedChange={onFixedChargeChange}
                />
              </div>

              {fixedDeliveryCharge && (
                <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                  <Label className="text-xs font-medium">
                    Fixed Delivery Amount (₹)
                  </Label>
                  <Input
                    type="number"
                    value={fixedDeliveryAmount}
                    onChange={(e) =>
                      onFixedAmountChange(Number(e.target.value))
                    }
                    placeholder="40"
                    className="h-8 text-sm w-36"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentTab({
  catalogId,
  isShopifyConnected,
}: {
  catalogId: string;
  isShopifyConnected: boolean;
}) {
  const { data: settings, isLoading } = useCatalogSettings(catalogId);
  const { mutateAsync: save, isPending: isSaving } =
    useUpdateCatalogSettings(catalogId);

  const [storeType, setStoreType] = useState<"standard" | "shopify">(
    "standard",
  );
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentConfig, setPaymentConfig] = useState<Record<string, string>>(
    {},
  );
  const [collectAddress, setCollectAddress] = useState(false);
  const [collectDelivery, setCollectDelivery] = useState(false);
  const [fixedDeliveryCharge, setFixedDeliveryCharge] = useState(false);
  const [fixedDeliveryAmount, setFixedDeliveryAmount] = useState(0);

  useEffect(() => {
    if (settings) {
      setStoreType(settings.storeType ?? "standard");
      setPaymentMethod(
        settings.paymentMethod ??
          (settings.storeType === "shopify" ? "shopify_checkout" : "manual"),
      );
      setPaymentConfig((settings.standardPaymentConfig as any) ?? {});
      setCollectAddress(settings.collectAddress ?? false);
      setCollectDelivery(settings.collectDelivery ?? false);
      setFixedDeliveryCharge(settings.fixedDeliveryCharge ?? false);
      setFixedDeliveryAmount(settings.fixedDeliveryAmount ?? 0);
    }
  }, [settings]);

  const handleSave = async () => {
    await save({
      storeType,
      paymentMethod: paymentMethod as any,
      standardPaymentConfig: paymentConfig,
      collectAddress,
      collectDelivery,
      fixedDeliveryCharge,
      fixedDeliveryAmount,
    });
  };

  if (isLoading || !catalogId) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const hasApprovedFlow = settings?.addressFlowStatus === "approved";
  const methods = storeType === "shopify" ? SHOPIFY_METHODS : STANDARD_METHODS;
  const selectedMethod = methods.find((m) => m.id === paymentMethod);

  return (
    <div className="space-y-6">
      {/* ── Store Type ──────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Store Type
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              key: "standard" as const,
              Icon: Building2,
              bg: "bg-blue-100 dark:bg-blue-950",
              color: "text-blue-600",
              label: "Standard",
              sub: "No Shopify required",
            },
            {
              key: "shopify" as const,
              Icon: ShoppingBag,
              bg: "bg-green-100 dark:bg-green-950",
              color: "text-green-600",
              label: "Shopify Store",
              sub: "Connected to Shopify",
            },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (opt.key === "shopify" && !isShopifyConnected) return;
                setStoreType(opt.key);
                setPaymentMethod(
                  opt.key === "shopify" ? "shopify_checkout" : "manual",
                );
              }}
              className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200
                ${opt.key === "shopify" && !isShopifyConnected ? "opacity-50 cursor-not-allowed" : ""}
                ${storeType === opt.key ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
            >
              {storeType === opt.key && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-primary" />
              )}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${opt.bg}`}
              >
                <opt.Icon className={`h-5 w-5 ${opt.color}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.sub}</p>
              </div>
              {opt.key === "shopify" && !isShopifyConnected && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-[10px] shrink-0"
                >
                  Requires Shopify
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Payment Method ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Payment Method
        </h3>
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          {methods.map((method) => {
            const isSelected = paymentMethod === method.id;
            const fields = (method as any).fields ?? [];
            const logos = (method as any).logos ?? [];
            const badges = (method as any).badges ?? [];
            return (
              <div
                key={method.id}
                className={`border-b border-border last:border-b-0 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
              >
                <button
                  onClick={() => setPaymentMethod(method.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {/* Proper Radio Button */}
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-2 border-primary" : "border-muted-foreground/40"}`}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Icon */}
                  <method.icon className="h-4 w-4 text-muted-foreground shrink-0" />

                  {/* Label & Description */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold text-foreground">
                      {method.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                      {method.desc}
                    </p>
                  </div>

                  {/* Payment Logos & Badges on the right */}
                  {(logos.length > 0 || badges.length > 0) && (
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {logos.map((logo: any) => (
                        <div
                          key={logo.src}
                          className="h-6 px-1.5 rounded border border-border bg-background shadow-2xs flex items-center justify-center"
                        >
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="h-3.5 w-auto object-contain"
                          />
                        </div>
                      ))}
                      {badges.map((b: any) => (
                        <span
                          key={b.label}
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-tight bg-background shadow-2xs ${b.className}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Configuration fields */}
                {isSelected && fields.length > 0 && (
                  <div className="p-4 border-t border-border/60 bg-muted/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map((f: any) => (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs font-medium text-foreground">
                            {f.label}
                          </Label>
                          <Input
                            value={paymentConfig[f.key] ?? ""}
                            onChange={(e) =>
                              setPaymentConfig((p) => ({
                                ...p,
                                [f.key]: e.target.value,
                              }))
                            }
                            placeholder={f.placeholder}
                            className="h-8 text-sm bg-background font-medium"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Collection Options (address + delivery toggles) ──────────────────── */}
      {selectedMethod && (
        <CollectToggles
          collectAddress={collectAddress}
          collectDelivery={collectDelivery}
          onAddressChange={setCollectAddress}
          onDeliveryChange={setCollectDelivery}
          addressApplicable={selectedMethod.collectAddressApplicable}
          deliveryApplicable={selectedMethod.collectDeliveryApplicable}
          hasApprovedFlow={hasApprovedFlow}
          fixedDeliveryCharge={fixedDeliveryCharge}
          fixedDeliveryAmount={fixedDeliveryAmount}
          onFixedChargeChange={setFixedDeliveryCharge}
          onFixedAmountChange={setFixedDeliveryAmount}
        />
      )}

      {/* ── Info tip ────────────────────────────────────────────────────────── */}
      {collectDelivery && !collectAddress && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-3 text-xs text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Delivery selection is on but address collection is off. The delivery
            charge will be added to the total but no address will be collected.
          </p>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={isSaving || !catalogId}
        className="gap-2"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
