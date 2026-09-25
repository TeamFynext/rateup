/**
 * Adds (or re-activates) a staff console user. The only way to create the first owner:
 * there is deliberately no bootstrap env var, which would be a standing path to owner if
 * the StaffUser table were ever emptied.
 *
 *   npm run staff:add -- someone@rateup.app            # a regular staff member
 *   npm run staff:add -- someone@rateup.app --owner    # can manage the staff list
 *   npm run staff:add -- someone@rateup.app --name "Some One"
 *
 * With NODE_ENV=development any domain is accepted, and Google sign-in then takes it too:
 *   npm run staff:add -- you@gmail.com --owner
 *
 * Against a deployed database: `railway run npm run staff:add -- …`.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const email = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"))
    ?.toLowerCase();
  const owner = process.argv.includes("--owner");
  const name = argValue("--name");
  const domain = (process.env.STAFF_GOOGLE_HD ?? "rateup.app").toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
    throw new Error('Usage: npm run staff:add -- <email> [--owner] [--name "Full Name"]');
  }
  // Locally, any address may be added; Google sign-in accepts any domain there too
  // (staffSignInDomain). Only an explicit NODE_ENV=development opens this: production does
  // not set NODE_ENV at all.
  const development = process.env.NODE_ENV === "development";
  if (!development && !email.endsWith(`@${domain}`)) {
    throw new Error(`${email} is not a @${domain} address; Google sign-in would refuse it.`);
  }

  const existing = await prisma.staffUser.findUnique({ where: { email } });
  const staff = await prisma.staffUser.upsert({
    where: { email },
    create: { email, name, isOwner: owner },
    update: {
      active: true,
      deactivatedAt: null,
      ...(owner ? { isOwner: true } : {}),
      ...(name ? { name } : {}),
    },
  });

  const verb = existing ? (existing.active ? "Updated" : "Re-activated") : "Added";
  console.log(`${verb} ${staff.email}${staff.isOwner ? " (owner)" : ""} — id ${staff.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
