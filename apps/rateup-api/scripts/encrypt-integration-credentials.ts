/**
 * Encrypt the secret fields of every existing Integration.credential.
 *
 *   npm run integrations:encrypt-credentials            # reports what it would do
 *   npm run integrations:encrypt-credentials -- --apply # writes
 *
 * Rows written since INTEGRATION_SECRET_KEY was set are already encrypted by the
 * Prisma client; this catches the ones from before. Reads go through the client,
 * which decrypts, and each row is written back through it, which encrypts — so a
 * row already encrypted comes back out identical in content and the script can
 * be re-run safely after an interruption.
 *
 * One row per statement, not a transaction: an integration refreshing its token
 * mid-run then loses nothing but that row's turn, which the next run picks up.
 *
 * Needs DATABASE_URL and INTEGRATION_SECRET_KEY in the environment. Refuses to
 * run without the key, which would write every row back as plaintext.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";
import { encryptCredentialSecrets } from "../src/modules/integrations/shared/credentialCrypto.js";
import { getIntegrationKey } from "../src/modules/integrations/shared/integrationSecret.js";

/** True when any value in the stored blob is still plaintext under a secret key. */
function hasPlaintextSecret(raw: unknown, encrypted: unknown): boolean {
  // Compared against what the client would write: a field that encryption
  // changes is one that is still stored in the clear.
  return JSON.stringify(raw) !== JSON.stringify(encrypted);
}

async function main() {
  if (!getIntegrationKey("credential-encryption")) {
    throw new Error("Set INTEGRATION_SECRET_KEY before running this script");
  }
  const apply = process.argv.includes("--apply");

  // The stored form, read with raw SQL so the client does not decrypt it.
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string; credential: unknown }>>`
    SELECT id, name, credential FROM "Integration"`;

  let pending = 0;
  for (const row of rows) {
    // Only plaintext secrets change under encryption; already-encrypted ones
    // are left alone by `encryptSecret`.
    if (!hasPlaintextSecret(row.credential, encryptCredentialSecrets(row.credential))) continue;
    pending++;
    console.log(`${apply ? "encrypting" : "would encrypt"} ${row.name} ${row.id}`);
    if (!apply) continue;

    const current = await prisma.integration.findUnique({
      where: { id: row.id },
      select: { credential: true },
    });
    if (!current) continue;
    await prisma.integration.update({
      where: { id: row.id },
      data: { credential: current.credential as object },
    });
  }

  console.log(
    `${rows.length} integrations, ${pending} with plaintext secrets${apply ? " — encrypted" : ""}.`,
  );
  if (!apply && pending) console.log("Re-run with --apply to write.");

  // Sanity check after applying: nothing under a secret key should be plaintext.
  if (apply) {
    const after = await prisma.$queryRaw<Array<{ credential: unknown }>>`
      SELECT credential FROM "Integration"`;
    const left = after.filter((r) =>
      hasPlaintextSecret(r.credential, encryptCredentialSecrets(r.credential)),
    ).length;
    console.log(left ? `${left} rows still have plaintext secrets.` : "All secrets encrypted.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
