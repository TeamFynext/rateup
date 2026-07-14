import { CalendarClock, Plus, ShoppingCart, TicketPercent } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { useCommerce } from "../CommerceContext";
import { CommerceShell } from "../CommerceShell";

type Status = "active" | "scheduled" | "expired";

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-600" },
  scheduled: { label: "Scheduled", cls: "bg-primary/10 text-primary" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
};

// Placeholder coupons — wire to a discounts endpoint when available.
const COUPONS: Array<{
  code: string;
  type: string;
  cond: string;
  used: number;
  status: Status;
  expiry: string;
  accent: string;
}> = [
  {
    code: "WELCOME10",
    type: "10% off",
    cond: "Min order {c}999",
    used: 142,
    status: "active",
    expiry: "Expires Aug 31",
    accent: "text-primary",
  },
  {
    code: "FLAT200",
    type: "{c}200 off",
    cond: "Min order {c}1,499",
    used: 88,
    status: "active",
    expiry: "Expires Jul 31",
    accent: "text-amber-600",
  },
  {
    code: "FREESHIP",
    type: "Free shipping",
    cond: "Min order {c}799",
    used: 305,
    status: "active",
    expiry: "No expiry",
    accent: "text-emerald-600",
  },
  {
    code: "SUMMER25",
    type: "25% off",
    cond: "Min order {c}1,999",
    used: 0,
    status: "scheduled",
    expiry: "Starts Jul 15",
    accent: "text-sky-600",
  },
  {
    code: "FESTIVE15",
    type: "15% off",
    cond: "All products",
    used: 512,
    status: "expired",
    expiry: "Expired Jun 30",
    accent: "text-muted-foreground",
  },
];

export function CouponsPage() {
  const { currencySymbol: sym } = useCommerce();
  const [coupons, setCoupons] = useState(() =>
    COUPONS.map((c) => ({ ...c, enabled: c.status === "active" })),
  );

  const toggle = (code: string) =>
    setCoupons((prev) => prev.map((c) => (c.code === code ? { ...c, enabled: !c.enabled } : c)));

  return (
    <CommerceShell
      title="Coupons & Discounts"
      description="Create and manage promo codes for your store."
      actions={
        <Button size="sm">
          <Plus data-icon="inline-start" />
          Create Coupon
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {coupons.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <Card
              key={c.code}
              className={cn("gap-0 overflow-hidden py-0", c.status === "expired" && "opacity-65")}
            >
              <div className="flex items-start justify-between border-b border-dashed px-4.5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TicketPercent className={cn("size-4", c.accent)} />
                    <span className="font-mono text-sm font-bold tracking-wide text-foreground">
                      {c.code}
                    </span>
                  </div>
                  <div className={cn("mt-2 text-lg font-bold", c.accent)}>
                    {c.type.split("{c}").join(sym)}
                  </div>
                </div>
                <Badge className={meta.cls}>{meta.label}</Badge>
              </div>
              <div className="flex flex-col gap-2.5 px-4.5 py-3.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="size-3.5" />
                  {c.cond.split("{c}").join(sym)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {c.expiry}
                </div>
                <Separator className="my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {c.used.toLocaleString("en-IN")}
                    </span>{" "}
                    uses
                  </span>
                  <Switch checked={c.enabled} onCheckedChange={() => toggle(c.code)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </CommerceShell>
  );
}
