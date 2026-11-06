import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { IconBook, IconBuildingStore } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { cn } from "@/lib/utils";

import { useCommerce } from "./CommerceContext";

function StoreSwitcher() {
  const { t } = useTranslation();
  const { waSettings, selectedSettingId, setSelectedSettingId } = useCommerce();
  if (waSettings.length === 0) return null;

  return (
    <Select
      value={selectedSettingId}
      onValueChange={(value) => setSelectedSettingId(value ?? "")}
      items={waSettings.map((s) => ({
        value: s.id,
        label: s.phoneDisplayName || s.phone || t("Unknown"),
      }))}
    >
      <SelectTrigger aria-label={t("Select store")} className="w-[200px]">
        <IconBuildingStore className="size-4 text-muted-foreground" data-icon="inline-start" />
        <SelectValue placeholder={t("Select store")} />
      </SelectTrigger>
      <SelectContent>
        {waSettings.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.phoneDisplayName || s.phone || t("Unknown")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CatalogSwitcher() {
  const { t } = useTranslation();
  const { catalogs, catalogId, setCatalogId, connectedCatalogId } = useCommerce();
  if (catalogs.length === 0) return null;

  return (
    <Select
      value={catalogId}
      onValueChange={(value) => setCatalogId(value ?? "")}
      items={catalogs.map((c) => ({ value: c.catalogId, label: c.name || c.catalogId }))}
    >
      <SelectTrigger aria-label={t("Select catalog")} className="w-[220px]">
        <IconBook className="size-4 text-muted-foreground" data-icon="inline-start" />
        <SelectValue placeholder={t("Select catalog")} />
      </SelectTrigger>
      <SelectContent>
        {catalogs.map((c) => (
          <SelectItem key={c.catalogId} value={c.catalogId}>
            {c.name || c.catalogId}
            {c.catalogId === connectedCatalogId && (
              <span className="ml-2 text-xs text-muted-foreground">{t("Connected")}</span>
            )}
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
  showCatalogSwitcher = false,
  back,
  children,
}: Readonly<{
  title: string;
  back?: { to: string; search?: Record<string, unknown>; label: string };
  description?: string;
  actions?: ReactNode;
  showStoreSwitcher?: boolean;
  showCatalogSwitcher?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-5">
      {back && <BackLink to={back.to} search={back.search} label={back.label} />}
      <PageHeading
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {showStoreSwitcher && <StoreSwitcher />}
            {showCatalogSwitcher && <CatalogSwitcher />}
            {actions}
          </div>
        }
      />
      <div className="**:data-[slot=card]:border **:data-[slot=card]:border-border **:data-[slot=card]:bg-card **:data-[slot=card]:shadow-xs **:data-[slot=card]:ring-0">
        {children}
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
