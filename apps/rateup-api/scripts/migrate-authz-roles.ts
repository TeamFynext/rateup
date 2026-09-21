/**
 * Writes `OrgMember.roleKey` from the legacy `role` column (src/authz/roles.ts maps
 * SUPER_ADMIN → OWNER for the org owner and ADMIN otherwise, ADMIN → MANAGER,
 * MEMBER → STAFF), fixes an `Org.ownerId` that names a non-member, maps pending
 * `Invitation.role`, sets aside every `TeamFeatureAccess` row in `AuthzMigrationArchive`
 * and clears the actor cache.
 *
 *   npm run authz:migrate            # dry run: prints the report, writes nothing
 *   npm run authz:migrate -- --apply
 *
 * Not a Prisma migration on purpose: one transaction over every org would hold locks on
 * OrgMember and Invitation for the whole rewrite. This commits per org and only touches
 * rows whose roleKey is still NULL, so it can be re-run after an interruption.
 *
 * Needs DATABASE_URL in the environment; REDIS_URL is used to clear the actor cache and may be
 * unreachable from a laptop, in which case the cache simply expires.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";
import redis from "../src/utils/redisConnection.js";
import { planOrgRoles, tallyRoles } from "../src/authz/migration.js";
import { legacyRoleToKey, roleKeyToLegacy, DEFAULT_INVITED_ROLE } from "../src/authz/roles.js";

const apply = process.argv.includes("--apply");

async function archiveTeamFeatureAccess(): Promise<number> {
  const rows = await prisma.teamFeatureAccess.findMany();
  if (rows.length === 0) return 0;
  const already = await prisma.authzMigrationArchive.count({
    where: { kind: "TeamFeatureAccess" },
  });
  if (already > 0) return 0;
  if (apply) {
    await prisma.authzMigrationArchive.createMany({
      data: rows.map((row) => ({ kind: "TeamFeatureAccess", payload: row })),
    });
  }
  return rows.length;
}

async function clearActorCache(): Promise<number> {
  // Best effort: the actor cache expires within 60 s on its own, and this often runs from a
  // machine that can reach Postgres but not the private Redis host. The client queues commands
  // while disconnected, so without a deadline an unreachable Redis would hang here forever.
  // The rewrite above has already committed, so a failure is reported, not fatal.
  const sweep = async () => {
    let cursor = "0";
    let removed = 0;
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", "authz:*", "COUNT", 500);
      cursor = next;
      if (keys.length > 0) {
        removed += keys.length;
        if (apply) await redis.del(...keys);
      }
    } while (cursor !== "0");
    return removed;
  };
  const deadline = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Redis did not answer within 5 s")), 5_000),
  );
  try {
    return await Promise.race([sweep(), deadline]);
  } catch (err) {
    console.warn(
      "Could not clear the actor cache; it expires within 60 s.",
      err instanceof Error ? err.message : err,
    );
    return -1;
  }
}

async function main() {
  console.log(apply ? "APPLY: writing changes" : "DRY RUN: nothing will be written");

  const orgs = await prisma.org.findMany({
    select: {
      id: true,
      name: true,
      ownerId: true,
      // `members`, not `orgMembers`: that is the relation's name on Org (schema.prisma:177).
      members: { select: { userId: true, role: true, roleKey: true, createdAt: true } },
    },
  });

  const plans = orgs.map((org) =>
    // No cast: the select above already produces `MemberRow`, and asserting it was what let a
    // wrong relation name through to runtime.
    planOrgRoles({ id: org.id, ownerId: org.ownerId, members: org.members }),
  );

  for (const plan of plans) {
    if (plan.updates.length === 0 && !plan.newOwnerId) continue;
    if (apply) {
      await prisma.$transaction(async (tx) => {
        if (plan.newOwnerId) {
          await tx.org.update({ where: { id: plan.orgId }, data: { ownerId: plan.newOwnerId } });
        }
        for (const u of plan.updates) {
          await tx.orgMember.update({
            where: { userId_orgId: { userId: u.userId, orgId: plan.orgId } },
            data: { roleKey: u.roleKey, role: roleKeyToLegacy(u.roleKey) },
          });
        }
      });
    }
  }

  // Pending invitations: the role they will grant, in both spellings. NULL used to mean
  // ADMIN by omission; it now means the default invited role.
  const pending = await prisma.invitation.findMany({
    where: { status: "PENDING" },
    select: { id: true, role: true },
  });
  const nullRoleInvites = pending.filter((i) => i.role === null).length;
  if (apply && nullRoleInvites > 0) {
    await prisma.invitation.updateMany({
      where: { status: "PENDING", role: null },
      data: { role: roleKeyToLegacy(DEFAULT_INVITED_ROLE) },
    });
  }

  const archived = await archiveTeamFeatureAccess();
  const cacheKeys = await clearActorCache();

  const warnings = plans.flatMap((p) => p.warnings.map((w) => `${p.orgId}: ${w}`));
  console.log("\n=== Report ===");
  console.log(`orgs: ${orgs.length}`);
  console.log(`members written: ${plans.reduce((n, p) => n + p.updates.length, 0)}`);
  console.log("by role:", tallyRoles(plans));
  console.log(`owners repaired: ${plans.filter((p) => p.newOwnerId).length}`);
  console.log(`pending invitations with no role → ${DEFAULT_INVITED_ROLE}: ${nullRoleInvites}`);
  console.log(`TeamFeatureAccess rows archived: ${archived}`);
  console.log(
    cacheKeys < 0
      ? "actor cache: not cleared (Redis unreachable), expires within 60 s"
      : `actor cache keys cleared: ${cacheKeys}`,
  );
  if (warnings.length > 0) {
    console.log("\nwarnings:");
    for (const w of warnings) console.log("  " + w);
  }
  // Legacy MEMBERs whose teams hid modules: they gain those modules now (decision recorded
  // in the plan). Listed so customer success can tell them.
  const gaining = await prisma.$queryRaw<{ orgId: string; userId: string; hidden: number }[]>`
    SELECT om."orgId", om."userId", COUNT(*)::int AS hidden
    FROM "OrgMember" om
    JOIN "TeamMember" tm ON tm."userId" = om."userId"
    JOIN "Team" t ON t.id = tm."teamId" AND t."orgId" = om."orgId"
    WHERE om.role = 'MEMBER'
    GROUP BY om."orgId", om."userId"
    HAVING COUNT(DISTINCT tm."teamId") > 0
       AND (SELECT COUNT(*) FROM "TeamFeatureAccess" tfa WHERE tfa."teamId" IN
              (SELECT "teamId" FROM "TeamMember" WHERE "userId" = om."userId")) < 5
  `;
  console.log(`legacy members whose teams enabled fewer than five modules: ${gaining.length}`);
  void legacyRoleToKey;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
