import { IconCrown, IconUser } from "@tabler/icons-react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import { toFiniteNumber } from "../../giveback/calculateGiveback.ts";
import { formatMoney } from "../../giveback/format.ts";
import { readableTextOn } from "../brand.ts";
import { HEX_COLOUR, type VipTierFormInput } from "../schemas.ts";

interface VipLadderPreviewProps {
  control: Control<VipTierFormInput>;
  currencySymbol: string;
  currencyCode: string;
  title?: string;
  hint?: string;
}

/**
 * The ladder as a customer would read it, top rung first: everyone starts as a Member, and
 * the sentence under each rung above says exactly what it takes to climb to it. Tier
 * colours are the merchant's, hence the `style` props.
 */
export function VipLadderPreview({
  control,
  currencySymbol,
  currencyCode,
  title,
  hint,
}: Readonly<VipLadderPreviewProps>) {
  const { t } = useTranslation();
  const tiersEnabled = useWatch({ control, name: "tiersEnabled" });
  const base = useWatch({ control, name: "base" });
  const upper = useWatch({ control, name: "upper" });
  const months = useWatch({ control, name: "qualificationWindowMonths" });

  const safe = (hex: unknown, fallback: string) =>
    typeof hex === "string" && HEX_COLOUR.test(hex) ? hex : fallback;
  const baseColour = safe(base?.color, "#5a8cc6");
  const windowMonths = typeof months === "number" ? months : 12;

  // Highest spend first, as a customer reads a ladder — whatever order the form holds.
  const rungs = (Array.isArray(upper) ? upper : [])
    .map((tier, index) => ({
      key: index,
      colour: safe(tier?.color, index === 0 ? "#f8951d" : "#db7a0b"),
      name: String(tier?.name ?? "").trim() || t("VIP"),
      threshold: toFiniteNumber(tier?.threshold),
      multiplier: toFiniteNumber(tier?.pointsMultiplier),
      perks: String(tier?.benefitsDescription ?? "")
        .split(/\n|,|;|•/)
        .map((line) => line.trim())
        .filter(Boolean),
    }))
    .sort((a, b) => b.threshold - a.threshold);

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title ?? t("The ladder")}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>

        <ol className="relative flex flex-col gap-5 pl-1">
          {tiersEnabled ? (
            <>
              {rungs.map((rung) => (
                <li key={rung.key} className="relative flex items-start gap-3">
                  <span
                    aria-hidden
                    className="absolute top-8 left-[15px] h-[calc(100%-4px)] w-0.5 rounded-full bg-border"
                  />
                  <Rung colour={rung.colour} icon={<IconCrown size={15} />} />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-foreground">{rung.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rung.threshold > 0
                        ? windowMonths === 0
                          ? t("Spend {amount} in total to reach {name}", {
                              amount: formatMoney(rung.threshold, currencyCode, currencySymbol),
                              name: rung.name,
                            })
                          : t("Spend {amount} within {months} months to reach {name}", {
                              amount: formatMoney(rung.threshold, currencyCode, currencySymbol),
                              months: String(windowMonths),
                              name: rung.name,
                            })
                        : t("Set the spend that unlocks it")}
                    </p>
                    {rung.multiplier > 1 && (
                      <p className="text-xs font-medium" style={{ color: rung.colour }}>
                        {t("Earns {rate}× points on every purchase", {
                          rate: String(Math.round(rung.multiplier * 100) / 100),
                        })}
                      </p>
                    )}
                    {rung.perks.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-foreground">
                        {rung.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-1.5">
                            <span
                              aria-hidden
                              className="mt-1.5 size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: rung.colour }}
                            />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-3">
                <Rung colour={baseColour} icon={<IconUser size={15} />} />
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {String(base?.name ?? "").trim() || t("Member")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Everyone starts here and earns at the same rate.")}
                  </p>
                </div>
              </li>
            </>
          ) : (
            <li className="flex items-start gap-3">
              <Rung colour={baseColour} icon={<IconUser size={15} />} />
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-foreground">{t("Member")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("One flat programme: everyone earns and redeems the same.")}
                </p>
              </div>
            </li>
          )}
        </ol>

        {tiersEnabled && (
          <p className="text-[11px] text-muted-foreground">
            {windowMonths === 0
              ? t("Spend counts for life, so a customer who reaches a tier keeps it.")
              : t(
                  "Spend is counted over the trailing window, so a customer who goes quiet drops back a tier.",
                )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Rung({ colour, icon }: Readonly<{ colour: string; icon: React.ReactNode }>) {
  return (
    <span
      aria-hidden
      className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card shadow-sm"
      style={{ backgroundColor: colour, color: readableTextOn(colour) }}
    >
      {icon}
    </span>
  );
}
