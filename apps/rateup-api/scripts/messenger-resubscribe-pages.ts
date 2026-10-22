/**
 * Adds the Page webhook fields RateUp now needs (`messaging_referrals` for m.me link rules,
 * `feed` for Facebook comment rules) to every connected Messenger Page.
 *
 *   npm run messenger:resubscribe-pages            # dry run: lists what it would change
 *   npm run messenger:resubscribe-pages -- --apply
 *
 * A Page picks up PAGE_SUBSCRIBED_FIELDS only when it is connected, so Pages connected
 * before a field was added never get it. Posting `subscribed_apps` sets the app's fields
 * outright, and lead ads subscribes the same Page to `leadgen` on its own, so this reads
 * each Page's current fields and writes back the union: nothing already subscribed is
 * dropped. Re-running is safe; a Page that already has every field is skipped. A Page whose
 * connection lacks the permissions for `feed` is subscribed without it, and reported.
 *
 * Needs DATABASE_URL and the encryption key in the environment.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";
import { callMetaApi } from "../src/modules/whatsapp/wa_axios.js";
import { decryptInlineToken } from "../src/modules/whatsapp/settings/wa_settings.service.js";
import {
  PAGE_COMMENT_FIELDS,
  PAGE_SUBSCRIBED_FIELDS,
} from "../src/modules/whatsapp/metaChannel/metaChannel.service.js";

const WANTED = [...PAGE_SUBSCRIBED_FIELDS, ...PAGE_COMMENT_FIELDS];

interface SubscribedApp {
  id: string;
  name?: string;
  subscribed_fields?: string[];
}

async function main() {
  const apply = process.argv.includes("--apply");

  const pages = await prisma.channel.findMany({
    where: { platform: "FACEBOOK" },
    select: {
      orgId: true,
      accountId: true,
      name: true,
      meta: { select: { pageAccessToken: true, appId: true } },
    },
  });

  let changed = 0;
  let failed = 0;
  for (const page of pages) {
    const label = `${page.name ?? "(unnamed)"} ${page.accountId} (org ${page.orgId})`;
    const token = decryptInlineToken(page.meta?.pageAccessToken ?? null);
    if (!token) {
      console.warn(`skip ${label}: no page token`);
      continue;
    }

    try {
      const res = await callMetaApi(`/${page.accountId}/subscribed_apps`, "GET", token);
      if (res.status >= 400) throw new Error(JSON.stringify(res.data?.error ?? res.data));
      const apps: SubscribedApp[] = res.data?.data ?? [];
      // The page token's own app; with one app subscribed, that is it. With several and no
      // match, its current fields are unknown, and writing ours alone could drop `leadgen`.
      const ours =
        apps.find((app) => app.id === page.meta?.appId) ?? (apps.length === 1 ? apps[0] : null);
      if (!ours && apps.length > 1) {
        console.warn(
          `skip ${label}: ${apps.length} apps subscribed and none is ours; reconnect it`,
        );
        continue;
      }
      const current = ours?.subscribed_fields ?? [];
      const missing = WANTED.filter((field) => !current.includes(field));

      if (!missing.length) {
        console.log(`ok   ${label}`);
        continue;
      }
      console.log(`${apply ? "add " : "would add"} ${missing.join(",")} → ${label}`);
      if (!apply) continue;

      const subscribe = (fields: string[]) =>
        callMetaApi(
          `/${page.accountId}/subscribed_apps?subscribed_fields=${[...new Set([...current, ...fields])].join(",")}`,
          "POST",
          token,
        );
      try {
        await subscribe(WANTED);
      } catch (error) {
        // Without the comment permissions Meta refuses the whole call; keep the rest.
        await subscribe(PAGE_SUBSCRIBED_FIELDS);
        console.warn(`     comments refused for ${label}: ${(error as Error).message}`);
      }
      changed++;
    } catch (error) {
      failed++;
      console.error(`fail ${label}: ${(error as Error).message}`);
    }
  }

  console.log(
    `\n${pages.length} Messenger Page(s); ${apply ? `${changed} updated` : "dry run"}, ${failed} failed.`,
  );
  if (!apply) console.log("Run again with --apply to make the changes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
