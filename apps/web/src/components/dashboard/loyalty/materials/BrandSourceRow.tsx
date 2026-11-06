import { IconPalette } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { Button } from "@/components/ui/button.tsx";

import { LOYALTY_PATHS } from "../paths.ts";

/**
 * Where the card's look comes from, read-only: colour, logo, hero. Changing any of them is
 * a Profile edit, so this row only points there rather than duplicating those fields.
 */
export function BrandSourceRow({ program }: Readonly<{ program: LoyaltyProgram }>) {
  const { t } = useTranslation();
  const colour = program.brandColor ?? "#1c518e";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <IconPalette size={16} className="shrink-0 text-muted-foreground" />
      <span
        aria-hidden
        className="size-4 rounded-full border border-border"
        style={{ backgroundColor: colour }}
      />
      <span className="font-mono text-xs text-muted-foreground">{colour}</span>
      {program.logoUrl ? (
        <img src={program.logoUrl} alt="" className="size-6 rounded-full object-cover" />
      ) : (
        <span className="text-xs text-muted-foreground">{t("No logo")}</span>
      )}
      {program.heroImageUrl ? (
        <img src={program.heroImageUrl} alt="" className="h-6 w-10 rounded object-cover" />
      ) : (
        <span className="text-xs text-muted-foreground">{t("No hero photo")}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        render={<Link to={LOYALTY_PATHS.program} search={{ section: "profile" }} />}
      >
        {t("Change in Profile")}
      </Button>
    </div>
  );
}
