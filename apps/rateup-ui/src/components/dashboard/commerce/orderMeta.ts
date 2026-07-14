// Maps real order stages (from OrdersTable's STAGE_CONFIG) to status-pill
// Tailwind classes. `cls` sets bg + text color; pills render a `bg-current` dot.
export const STAGE_META: Record<string, { label: string; short: string; cls: string }> = {
  PENDING_ADDRESS: {
    label: "Awaiting Address",
    short: "Address",
    cls: "bg-amber-500/10 text-amber-600",
  },
  PENDING_DELIVERY: {
    label: "Awaiting Delivery",
    short: "Delivery",
    cls: "bg-amber-500/10 text-amber-600",
  },
  PENDING_PAYMENT: {
    label: "Awaiting Payment",
    short: "Payment",
    cls: "bg-primary/10 text-primary",
  },
  PENDING_CHECKOUT: {
    label: "Checkout Sent",
    short: "Checkout",
    cls: "bg-sky-500/10 text-sky-600",
  },
  COMPLETED: { label: "Completed", short: "Done", cls: "bg-emerald-500/10 text-emerald-600" },
  CANCELLED: { label: "Cancelled", short: "Cancelled", cls: "bg-destructive/10 text-destructive" },
  DEFAULT: { label: "Pending", short: "Pending", cls: "bg-muted text-muted-foreground" },
};

const AVATAR_CLASSES = ["bg-primary", "bg-amber-500", "bg-slate-500", "bg-sky-500"];

export function avatarClass(seed: string): string {
  let hash = 0;
  for (let i = 0; i < (seed ?? "").length; i++)
    hash = (hash + seed.charCodeAt(i)) % AVATAR_CLASSES.length;
  return AVATAR_CLASSES[hash];
}
