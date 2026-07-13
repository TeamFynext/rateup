import {
  Banknote,
  Copy,
  CreditCard,
  Globe,
  Link2,
  MessageCircle,
  Plus,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";
import { initials, money } from "../utils";

const GATEWAYS = [
  {
    id: "razorpay",
    name: "Razorpay",
    desc: "Cards · UPI · Netbanking · Wallets",
    icon: CreditCard,
    tile: "bg-primary/10 text-primary",
    badge: "Popular in India",
    enabled: true,
  },
  {
    id: "whatsapp_pay",
    name: "WhatsApp Pay",
    desc: "In-chat UPI payments",
    icon: MessageCircle,
    tile: "bg-emerald-500/10 text-emerald-600",
    badge: "Zero redirect",
    enabled: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    desc: "International cards & wallets",
    icon: Globe,
    tile: "bg-sky-500/10 text-sky-600",
    enabled: true,
  },
  {
    id: "cod",
    name: "Cash on Delivery",
    desc: "Collect payment on delivery",
    icon: Banknote,
    tile: "bg-amber-500/10 text-amber-600",
    enabled: true,
  },
  {
    id: "paypal",
    name: "PayPal",
    desc: "Global digital wallet",
    icon: Wallet,
    tile: "bg-muted text-muted-foreground",
    enabled: false,
  },
] as const;

// Placeholder payment-link activity — wire to a payment-links endpoint later.
const PAYMENT_LINKS = [
  { customer: "Ankush Sharma", amount: 4197, status: "Paid", date: "2h ago" },
  { customer: "Neha Verma", amount: 1599, status: "Pending", date: "5h ago" },
  { customer: "Arjun Mehta", amount: 3698, status: "Pending", date: "1d ago" },
  { customer: "Fatima Ali", amount: 5298, status: "Paid", date: "2d ago" },
];

export function PaymentsPage() {
  const { currencySymbol: sym, isCatalogConnected } = useCommerce();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GATEWAYS.map((g) => [g.id, g.enabled])),
  );

  return (
    <CommerceShell
      title="Payments"
      description="Payment methods, links and settlement settings."
      actions={
        <Button size="sm" disabled={!isCatalogConnected}>
          <Link2 data-icon="inline-start" />
          New Payment Link
        </Button>
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Payment methods */}
        <div className="flex flex-col gap-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Payment Methods
          </div>
          {GATEWAYS.map((g) => {
            const on = enabled[g.id];
            return (
              <Card key={g.id} className="flex-row items-center gap-3.5 p-4.5">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    g.tile,
                  )}
                >
                  <g.icon className="size-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{g.name}</span>
                    {"badge" in g && g.badge && (
                      <Badge variant="secondary" className="text-[10px]">
                        {g.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{g.desc}</div>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    on ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {on ? "On" : "Off"}
                </span>
                <Switch
                  checked={on}
                  onCheckedChange={() => setEnabled((p) => ({ ...p, [g.id]: !p[g.id] }))}
                />
              </Card>
            );
          })}
        </div>

        {/* Payment links + settlement */}
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <div className="flex items-center justify-between border-b px-4.5 py-4">
              <span className="text-sm font-semibold text-foreground">Payment links</span>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <Plus className="size-3.5" />
                New
              </button>
            </div>
            {PAYMENT_LINKS.map((l) => (
              <div
                key={l.customer}
                className="flex items-center gap-2.5 border-b px-4.5 py-3 last:border-b-0"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-xs text-white">
                    {initials(l.customer)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{l.customer}</div>
                  <div className="text-xs text-muted-foreground">{l.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {money(l.amount, sym)}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      l.status === "Paid" ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {l.status}
                  </span>
                </div>
                <Copy className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Settlement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              {[
                ["Currency", sym === "₹" ? "INR (₹)" : "USD ($)"],
                ["Payout account", "HDFC ••4821"],
                ["Payout schedule", "Daily (T+2)"],
              ].map(([label, value], i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </CommerceShell>
  );
}
