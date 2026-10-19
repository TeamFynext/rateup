import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { announceSignup } from "../user/user.service.js";
import { hiddenModulesForGoals } from "./modules.js";
import type { BusinessProfileInput } from "./org.schema.js";

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/**
 * Saves the business details asked right after signup. Goals pick the visible modules only on
 * the first completion, so a later resubmit can't undo what the owner set in Settings → Features.
 */
export async function completeBusinessProfile(orgId: string, input: BusinessProfileInput) {
  const org = await prisma.org.findUniqueOrThrow({
    where: { id: orgId },
    select: { ownerId: true, onboarding: true, profileCompletedAt: true, createdAt: true },
  });
  const firstTime = !org.profileCompletedAt;
  const previous =
    org.onboarding && typeof org.onboarding === "object" && !Array.isArray(org.onboarding)
      ? org.onboarding
      : {};
  const phone = input.phoneNumber || undefined;
  const website = input.website ? withScheme(input.website) : undefined;
  const onboarding: Prisma.InputJsonObject = {
    ...previous,
    industry: input.industry || null,
    website: website ?? null,
    teamSize: input.teamSize || null,
    goals: input.goals.length ? input.goals : null,
  };

  const [updated, owner] = await prisma.$transaction([
    prisma.org.update({
      where: { id: orgId },
      data: {
        name: input.orgName,
        phone,
        onboarding,
        ...(firstTime && {
          profileCompletedAt: new Date(),
          hiddenModules: input.goals.length ? hiddenModulesForGoals(input.goals) : [],
          modulesChosenAt: new Date(),
        }),
      },
      select: { id: true, name: true, phone: true, hiddenModules: true, createdAt: true },
    }),
    prisma.user.update({
      where: { id: org.ownerId },
      data: phone ? { phone } : {},
      select: { name: true, email: true, createdAt: true },
    }),
  ]);

  if (firstTime) {
    await announceSignup({
      orgId,
      orgName: updated.name,
      orgCreatedAt: updated.createdAt,
      userName: owner.name ?? "",
      userEmail: owner.email ?? "",
      userCreatedAt: owner.createdAt,
      phone,
      contactPhone: phone,
      goals: input.goals,
      industry: input.industry,
      website,
      teamSize: input.teamSize,
    });
  }

  return { name: updated.name, phone: updated.phone, hiddenModules: updated.hiddenModules };
}
