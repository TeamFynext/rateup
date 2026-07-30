import {
  Banknote,
  Building2,
  CreditCard,
  ExternalLink,
  HandHelping,
  Landmark,
  Loader2,
  Save,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  useCatalogSettings,
  useUpdateCatalogSettings,
} from "@/backend/whatsapp/catalog/catalog.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

// ─── Shopify payment options ─────────────────────────────────────────────────
/** One selectable payment method in the orders & payments settings. */
interface PaymentMethodOption {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  logos?: Array<{ src: string; alt: string }>;
  badges?: Array<{ label: string; className: string }>;
  fields?: Array<{ key: string; label: string; placeholder: string }>;
  collectAddressApplicable: boolean;
  collectDeliveryApplicable: boolean;
}

const SHOPIFY_METHODS: PaymentMethodOption[] = [
  {
    id: "shopify_checkout",
    icon: ExternalLink,
    iconBg: "bg-green-100 dark:bg-green-950",
    iconColor: "text-green-600",
    label: "Shopify Checkout URL",
    desc: "Customer receives a Shopify cart link to complete address, delivery, and payment directly on your store.",
    logos: [
      { src: getFileUrlFromKey("/images/icons/visa.svg", false), alt: "Visa" },
      {
        src: getFileUrlFromKey("/images/icons/mastercard.svg", false),
        alt: "Mastercard",
      },
      {
        src: getFileUrlFromKey("/images/icons/rupay.png", false),
        alt: "RuPay",
      },
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
      { src: getFileUrlFromKey("/images/icons/gpay.png", false), alt: "GPay" },
      {
        src: getFileUrlFromKey("/images/icons/phonepe.svg", false),
        alt: "PhonePe",
      },
      { src: getFileUrlFromKey("/images/icons/upi.svg", false), alt: "UPI" },
    ],
    badges: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
];

// ─── Standard payment options ────────────────────────────────────────────────
const STANDARD_METHODS: PaymentMethodOption[] = [
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
      { src: getFileUrlFromKey("/images/icons/gpay.png", false), alt: "GPay" },
      {
        src: getFileUrlFromKey("/images/icons/phonepe.svg", false),
        alt: "PhonePe",
      },
      { src: getFileUrlFromKey("/images/icons/upi.svg", false), alt: "UPI" },
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
      { src: getFileUrlFromKey("/images/icons/gpay.png", false), alt: "GPay" },
      {
        src: getFileUrlFromKey("/images/icons/phonepe.svg", false),
        alt: "PhonePe",
      },
      { src: getFileUrlFromKey("/images/icons/upi.svg", false), alt: "UPI" },
    ],
    badges: [],
    fields: [],
    collectAddressApplicable: true,
    collectDeliveryApplicable: true,
  },
];

export default function PaymentTab({
  catalogId,
  isShopifyConnected,
}: Readonly<{
  catalogId: string;
  isShopifyConnected: boolean;
}>) {
  const { data: settings } = useCatalogSettings(catalogId);
  const { mutateAsync: save, isPending: isSaving } = useUpdateCatalogSettings(catalogId);

  const [storeType, setStoreType] = useState<"standard" | "shopify">("standard");
  const [paymentMethod, setPaymentMethod] = useState("manual");
  const [paymentConfig, setPaymentConfig] = useState<Record<string, string>>({});
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

  // if (isLoading || !catalogId) {
  //   return (
  //     <div className="space-y-4">
  //       {[1, 2, 3].map((i) => (
  //         <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
  //       ))}
  //     </div>
  //   );
  // }

  const methods = storeType === "shopify" ? SHOPIFY_METHODS : STANDARD_METHODS;

  const STORE_TYPES = [
    {
      key: "standard" as const,
      Icon: Building2,
      tile: "bg-primary/10 text-primary",
      label: "Standard",
      sub: "No Shopify required",
    },
    {
      key: "shopify" as const,
      Icon: ShoppingBag,
      tile: "bg-emerald-500/10 text-emerald-600",
      label: "Shopify Store",
      sub: "Connected to Shopify",
    },
  ];

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      {/* Store type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Store type</CardTitle>
          <p className="text-xs text-muted-foreground">
            Where orders are fulfilled and how checkout is handled.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STORE_TYPES.map((opt) => {
            const selected = storeType === opt.key;
            const locked = opt.key === "shopify" && !isShopifyConnected;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={locked}
                onClick={() => {
                  setStoreType(opt.key);
                  setPaymentMethod(opt.key === "shopify" ? "shopify_checkout" : "manual");
                }}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  locked && "cursor-not-allowed opacity-50",
                  selected ? "border-primary bg-primary/5" : "hover:bg-accent",
                )}
              >
                {selected && (
                  <span className="absolute right-3 top-3 size-2.5 rounded-full bg-primary" />
                )}
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    opt.tile,
                  )}
                >
                  <opt.Icon className="size-4.5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.sub}</div>
                </div>
                {locked && (
                  <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                    Requires Shopify
                  </Badge>
                )}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card className="gap-0 py-0">
        <CardHeader className="py-5">
          <CardTitle className="text-sm">Payment method</CardTitle>
          <p className="text-xs text-muted-foreground">How the customer pays for their order.</p>
        </CardHeader>
        <CardContent className="flex flex-col p-0">
          {methods.map((method) => {
            const isSelected = paymentMethod === method.id;
            const fields = method.fields ?? [];
            const logos = method.logos ?? [];
            const badges = method.badges ?? [];
            return (
              <div
                key={method.id}
                className={cn(
                  "border-t transition-colors",
                  isSelected ? "bg-primary/5" : "hover:bg-accent/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      isSelected ? "border-2 border-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {isSelected && <span className="size-2 rounded-full bg-primary" />}
                  </span>

                  <method.icon className="size-4 shrink-0 text-muted-foreground" />

                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-sm font-semibold text-foreground">{method.label}</div>
                    <div className="mt-0.5 text-xs leading-normal text-muted-foreground">
                      {method.desc}
                    </div>
                  </div>

                  {(logos.length > 0 || badges.length > 0) && (
                    <div className="flex shrink-0 items-center gap-1.5 pl-2">
                      {logos.map((logo: any) => (
                        <span
                          key={logo.src}
                          className="flex h-6 items-center justify-center rounded border bg-background px-1.5"
                        >
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="h-3.5 w-auto object-contain"
                          />
                        </span>
                      ))}
                      {badges.map((b: any) => (
                        <Badge key={b.label} variant="outline" className="text-[10px]">
                          {b.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>

                {isSelected && fields.length > 0 && (
                  <div className="border-t bg-muted/30 p-4">
                    <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {fields.map((f: any) => (
                        <Field key={f.key}>
                          <FieldLabel htmlFor={`pay-${f.key}`}>{f.label}</FieldLabel>
                          <Input
                            id={`pay-${f.key}`}
                            value={paymentConfig[f.key] ?? ""}
                            onChange={(e) =>
                              setPaymentConfig((p) => ({ ...p, [f.key]: e.target.value }))
                            }
                            placeholder={f.placeholder}
                          />
                        </Field>
                      ))}
                    </FieldGroup>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving || !catalogId} className="w-fit">
        {isSaving ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
