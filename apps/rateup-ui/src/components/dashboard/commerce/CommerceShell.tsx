import { Store } from "lucide-react";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useCommerce } from "./CommerceContext";

function StoreSwitcher() {
  const { waSettings, selectedSettingId, setSelectedSettingId } = useCommerce();
  if (waSettings.length === 0) return null;

  return (
    <Select
      value={selectedSettingId}
      onValueChange={setSelectedSettingId}
      items={waSettings.map((s) => ({
        value: s.id,
        label: s.phoneDisplayName || s.phone || "Unknown",
      }))}
    >
      <SelectTrigger aria-label="Select store" className="w-[200px]">
        <Store className="size-4 text-muted-foreground" data-icon="inline-start" />
        <SelectValue placeholder="Select store" />
      </SelectTrigger>
      <SelectContent>
        {waSettings.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.phoneDisplayName || s.phone || "Unknown"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CommerceShell({
  title,
  description,
  actions,
  showStoreSwitcher = true,
  children,
}: Readonly<{
  title: string;
  description?: string;
  actions?: ReactNode;
  showStoreSwitcher?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-4 border-b bg-card px-6 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {showStoreSwitcher && <StoreSwitcher />}
          {actions}
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="mx-auto w-full max-w-[1180px] **:data-[slot=card]:border **:data-[slot=card]:border-border **:data-[slot=card]:bg-card **:data-[slot=card]:shadow-xs **:data-[slot=card]:ring-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/** Status pill: `cls` provides bg + text color; the dot uses `bg-current`. */
export function StatusPill({
  cls,
  children,
  className,
}: Readonly<{ cls: string; children: ReactNode; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        cls,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
