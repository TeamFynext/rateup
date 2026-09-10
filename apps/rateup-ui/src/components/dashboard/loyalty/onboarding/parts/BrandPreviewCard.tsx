import { IconSparkles, IconStar } from "@tabler/icons-react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import { brandGradient, initialsOf, readableTextOn } from "../brand.ts";
import type { ProfileFormInput } from "../schemas.ts";
import { HEX_COLOUR } from "../schemas.ts";

/**
 * The wallet-pass shaped card a customer would carry, drawn live from the form. This is
 * what the logo, colour and hero image are for, so the merchant sees them land as they
 * pick them. Every colour here is the merchant's, hence the `style` props.
 */
export function BrandPreviewCard({
  control,
  pointsName,
  title,
}: Readonly<{ control: Control<ProfileFormInput>; pointsName: string; title?: string }>) {
  const { t } = useTranslation();
  const name = useWatch({ control, name: "name" });
  const businessName = useWatch({ control, name: "businessName" });
  const brandColor = useWatch({ control, name: "brandColor" });
  const logoUrl = useWatch({ control, name: "logoUrl" });
  const heroImageUrl = useWatch({ control, name: "heroImageUrl" });

  const colour = HEX_COLOUR.test(brandColor ?? "") ? String(brandColor) : "#1c518e";
  const ink = readableTextOn(colour);
  const business = String(businessName ?? "").trim() || t("Your business");
  const programName = String(name ?? "").trim() || t("Your loyalty program");

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <IconSparkles size={16} className="text-ru-amber-500" />
          <p className="text-sm font-medium text-foreground">
            {title ?? t("How it looks to customers")}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div
            className="relative h-24 bg-cover bg-center"
            style={
              heroImageUrl
                ? { backgroundImage: `url(${heroImageUrl})`, backgroundColor: colour }
                : { background: brandGradient(colour) }
            }
          >
            <div
              className="absolute -bottom-6 left-4 flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-card text-sm font-bold shadow-sm"
              style={{ color: colour }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-full object-cover" />
              ) : (
                initialsOf(business)
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 pt-8 pb-4">
            <div>
              <p className="font-display text-base font-bold text-foreground">{programName}</p>
              <p className="text-xs text-muted-foreground">{business}</p>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: colour, color: ink }}
              >
                <IconStar size={11} />
                {t("Member")}
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">120</span>{" "}
                {pointsName.trim() || t("Points")}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {t("This is the card your join page and QR poster are built from.")}
        </p>
      </CardContent>
    </Card>
  );
}
