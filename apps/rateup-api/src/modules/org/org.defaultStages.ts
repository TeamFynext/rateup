import { StageCategory } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";

/**
 * The pipeline every new organisation starts with.
 *
 * Lived in the update module's controller, which was a grab-bag of one-off migrations
 * behind unauthenticated HTTP routes. This one is not a migration at all — `createOrg`
 * calls it on every signup — so it moved here when that module was deleted.
 */
export async function seedDefaultStages(orgId: string) {
  const stages = [
    {
      name: "New Lead",
      ordering: 1,
      isDefault: true,
      category: StageCategory.active,
      emoji: "✨",
      description:
        "A potential customer who has just entered the pipeline and shown initial interest.",
      isWon: false,
    },
    {
      name: "Cold Lead",
      ordering: 1,
      isDefault: false,
      category: StageCategory.lost,
      emoji: "❄️",
      description:
        "A lead that has gone cold, showing little or no engagement despite outreach attempts.",
      isWon: false,
    },
    {
      name: "Engaged Lead",
      ordering: 2,
      isDefault: false,
      category: StageCategory.active,
      emoji: "⚡",
      description: "The Contact is actively interested and ready to move forward.",
      isWon: false,
    },
    {
      name: "In Negotiation",
      ordering: 3,
      isDefault: false,
      category: StageCategory.active,
      emoji: "💵",
      description:
        "The lead is reviewing the proposal, and pricing or payment discussions are underway.",
      isWon: false,
    },
    {
      name: "Customer",
      ordering: 4,
      isDefault: false,
      category: StageCategory.won,
      emoji: "🤩",
      description: "The lead has successfully completed a purchase and become a paying customer.",
      isWon: true,
    },
  ];

  await prisma.lifecycle.createMany({
    data: stages.map((stage) => ({
      ...stage,
      orgId,
    })),
  });
}
