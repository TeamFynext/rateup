import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";
import { ActionCard } from "@/components/common/action-card.tsx";
import { CardGrid } from "@/components/common/generic-card.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

import {
  buildExample,
  REWARD_EXAMPLE_KINDS,
  rewardExamplesFor,
  type BuiltExample,
} from "../onboarding/rewardExamples.ts";
import type { RewardValueType } from "../onboarding/rewardValue.ts";
import { formatPoints } from "./format.ts";
import { RewardWorthLine } from "./RewardWorthLine.tsx";

/** What the picker hands back: a filled-in example, or a request for an empty one. */
export type RewardExamplePick =
  | { kind: RewardValueType; built: BuiltExample }
  | { kind: RewardValueType; built: null };

export interface RewardExamplePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chooses the free-item vocabulary — a gym and a cafe get different suggestions. */
  presetKey: LoyaltyPresetKey;
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
  currencyCode: string;
  currencySymbol: string;
  pointsName: string;
  /** Trimmed, lowercased names already in the catalog — what the save keys on. */
  existingNames: readonly string[];
  /** Which sections to show. Defaults to all three. */
  kinds?: readonly RewardValueType[];
  /**
   * False for rewards handed out rather than bought — a free gift is assigned, so quoting a
   * points price and a giveback percentage against it would be a plain lie.
   */
  pricedInPoints?: boolean;
  onPick: (pick: RewardExamplePick) => void;
  /** Where the merchant goes to set a typical order value, if they have not. */
  onEditAverageOrderValue?: () => void;
}

/**
 * "Add a reward" — reward types, each with examples priced for this merchant.
 *
 * Sectioned rather than tabbed on purpose: the merchant does not know free-item and cash-off
 * rewards exist, and tabs would hide two of the three behind a click. Each section leads with
 * what that shape costs the business, because that is the part nobody tells them.
 *
 * Shared by the setup wizard and the standalone rewards editor. It deliberately does not know
 * either one's form shape: it hands back a `BuiltExample` and lets the caller convert, because
 * the two write `rewardValue` in different dialects.
 */
export function RewardExamplePicker({
  open,
  onOpenChange,
  presetKey,
  earnRate,
  averageOrderValue,
  currencyCode,
  currencySymbol,
  pointsName,
  existingNames,
  kinds = REWARD_EXAMPLE_KINDS,
  pricedInPoints = true,
  onPick,
  onEditAverageOrderValue,
}: Readonly<RewardExamplePickerProps>) {
  const { t } = useTranslation();

  const examples = rewardExamplesFor(presetKey);
  const canPrice = averageOrderValue !== null && averageOrderValue > 0;

  const sections: Record<RewardValueType, { title: string; blurb: string }> = {
    free_item: {
      title: t("Something free"),
      blurb: t(
        "Costs you what the item costs, not a share of every bill. Usually the kindest to your margin.",
      ),
    },
    discount_percentage: {
      title: t("A percentage off"),
      blurb: t("Scales with the bill — the bigger the order, the more it costs you."),
    },
    discount_fixed: {
      title: t("Cash off"),
      blurb: t("A flat amount off, whatever the bill comes to."),
    },
  };

  const pick = (value: RewardExamplePick) => {
    onPick(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[min(92vw,64rem)] max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("Add a reward")}</DialogTitle>
          <DialogDescription>
            {t(
              "Pick something close and edit it, or start blank. Every number stays yours to change.",
            )}
          </DialogDescription>
        </DialogHeader>

        {!canPrice && (
          <Alert>
            <IconAlertTriangle />
            <AlertTitle>{t("No typical order value set")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              {t("Tell us roughly what a customer spends and we will price these for you.")}
              {onEditAverageOrderValue && (
                <Button type="button" size="sm" variant="outline" onClick={onEditAverageOrderValue}>
                  {t("Set it now")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/*
          A plain div, not ScrollArea: Base UI's ScrollArea needs a bounded height and would
          simply overflow inside an auto-height dialog (see AGENTS.md).
        */}
        <div className="-mx-4 flex max-h-[70vh] flex-col gap-8 overflow-y-auto overscroll-contain px-4">
          {kinds.map((kind) => {
            const built = canPrice
              ? examples[kind]
                  .map((example) =>
                    buildExample(example, {
                      averageOrderValue,
                      earnRate,
                      currencyCode,
                      currencySymbol,
                    }),
                  )
                  .filter((value): value is BuiltExample => value !== null)
              : [];

            const tiles: Array<BuiltExample | "blank"> = [...built, "blank"];

            return (
              <section key={kind} className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{sections[kind].title}</h3>
                  <p className="text-xs text-muted-foreground">{sections[kind].blurb}</p>
                </div>

                <CardGrid
                  items={tiles}
                  getKey={(tile) => (tile === "blank" ? `${kind}-blank` : tile.example.id)}
                  renderItem={(tile) =>
                    tile === "blank" ? (
                      <ActionCard
                        title={
                          <span className="flex items-center gap-1.5">
                            <IconPlus size={16} />
                            {t("Start blank")}
                          </span>
                        }
                        subtitle={t("Name it and set the value yourself.")}
                        className="border-dashed bg-muted/30"
                        onClick={() => pick({ kind, built: null })}
                      />
                    ) : (
                      <ExampleCard
                        built={tile}
                        earnRate={earnRate}
                        averageOrderValue={averageOrderValue}
                        currencyCode={currencyCode}
                        currencySymbol={currencySymbol}
                        pointsName={pointsName}
                        pricedInPoints={pricedInPoints}
                        taken={existingNames.includes(tile.label.trim().toLowerCase())}
                        onPick={() => pick({ kind, built: tile })}
                      />
                    )
                  }
                />
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExampleCard({
  built,
  earnRate,
  averageOrderValue,
  currencyCode,
  currencySymbol,
  pointsName,
  pricedInPoints,
  taken,
  onPick,
}: Readonly<{
  built: BuiltExample;
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
  currencyCode: string;
  currencySymbol: string;
  pointsName: string;
  pricedInPoints: boolean;
  taken: boolean;
  onPick: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <ActionCard
      title={built.label}
      titleTooltip={built.label}
      subtitle={t(built.example.description)}
      content={
        /*
          The same component the row will render after picking, so the sentence in the dialog
          is the sentence on the row — nothing to keep in sync.
        */
        <RewardWorthLine
          rewardValue={built.rewardValue}
          pointsCost={built.pointsCost ?? 0}
          // Zeroing the earn rate is what makes the line stop at "Worth about X" — there is
          // no spend-to-earn for a reward nobody spends points on.
          earnRate={pricedInPoints ? earnRate : { pointsPerUnit: 0, multiplier: 0 }}
          averageOrderValue={averageOrderValue}
          currencySymbol={currencySymbol}
          currencyCode={currencyCode}
        />
      }
      footerLeft={
        !pricedInPoints || built.pointsCost === null ? null : (
          <Badge variant="secondary">{formatPoints(built.pointsCost, pointsName)}</Badge>
        )
      }
      footer={taken ? <Badge variant="outline">{t("Already added")}</Badge> : undefined}
      // Adding a second reward with the same name would collide on the key the API updates by.
      className={taken ? "cursor-default opacity-60 hover:translate-y-0" : undefined}
      onClick={taken ? undefined : onPick}
    />
  );
}
