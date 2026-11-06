import type { TFunction } from "i18next";

/**
 * The brochure designs a merchant can choose between.
 *
 * Four layouts of the same content — the programme's name, its earn rate, its rewards, its
 * terms — set for four different places a card gets put. Nothing here changes *what* the
 * brochure says; the copy and the reward selection are the same whichever is picked, so
 * switching design never loses work.
 *
 * Each design also states where its QR goes, because that is a layout decision rather than
 * a preference: on a table tent the scan is the whole point and the code earns a block of
 * its own, while on a menu card it belongs in the footer after the rewards have done the
 * persuading.
 */

export const BROCHURE_DESIGNS = ["menu", "poster", "tent", "typeset"] as const;

export type BrochureDesignKind = (typeof BROCHURE_DESIGNS)[number];

export function isBrochureDesign(value: unknown): value is BrochureDesignKind {
  return BROCHURE_DESIGNS.some((design) => design === value);
}

/** Where a design puts the QR when it is switched on. */
export type QrPlacement = "footer" | "feature";

export interface BrochureDesignMeta {
  kind: BrochureDesignKind;
  label: string;
  /** One line on where this card is meant to end up. */
  description: string;
  qrPlacement: QrPlacement;
  /** Whether the design uses the programme's hero photo at all. */
  usesHero: boolean;
}

export function brochureDesigns(t: TFunction): BrochureDesignMeta[] {
  return [
    {
      kind: "menu",
      label: t("Menu card"),
      description: t("A slim brand band over a paper body. Handed to a customer at the table."),
      qrPlacement: "footer",
      usesHero: true,
    },
    {
      kind: "poster",
      label: t("Poster"),
      description: t("The photo leads. For a wall or a counter easel, read from a distance."),
      qrPlacement: "footer",
      usesHero: true,
    },
    {
      kind: "tent",
      label: t("Table tent"),
      description: t("Short and square, rewards in two columns, the code given room."),
      qrPlacement: "feature",
      usesHero: false,
    },
    {
      kind: "typeset",
      label: t("Typeset"),
      description: t("No colour band — the brand carried by type and rules alone."),
      qrPlacement: "footer",
      usesHero: false,
    },
  ];
}

export function brochureDesign(t: TFunction, kind: BrochureDesignKind): BrochureDesignMeta {
  // The list is exhaustive over the union, so the fallback is unreachable — it exists so a
  // stored document naming a design this build does not know still renders something.
  return brochureDesigns(t).find((design) => design.kind === kind) ?? brochureDesigns(t)[0]!;
}

/** Where the QR sits for a design, without needing `t`. */
export const QR_PLACEMENT: Record<BrochureDesignKind, QrPlacement> = {
  menu: "footer",
  poster: "footer",
  tent: "feature",
  typeset: "footer",
};
