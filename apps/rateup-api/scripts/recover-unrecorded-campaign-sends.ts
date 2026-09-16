/**
 * Recover campaign messages that Meta accepted but that never got a WaMessage row.
 *
 *   npm run recover:campaign-sends -- --send <campaignSendId> --events <file.ndjson>
 *   npm run recover:campaign-sends -- --send <campaignSendId> --events <file.ndjson> --apply
 *
 * Without `--apply` it only reports what it would do.
 *
 * Background: on 2026-09-12 the dispatcher's post-send store failed (P2028 on a
 * starved Prisma pool) for ~2,800 recipients of one campaign. The messages were
 * delivered; the rows were never written; every receipt for them was
 * dead-lettered; the participants are still PENDING. The receipts themselves
 * carry no recipient, so the only place the wamid ↔ recipient pairing survives
 * is the API's webhook TRACE log (`WaEvent => {...}`), which includes
 * `recipient_id` on every status.
 *
 * `--events` is that log, one JSON object per line, in either form:
 *   - a Railway log export line: `{"message": "[..] TRACE (33): WaEvent => {...}", ...}`
 *   - the raw webhook body:     `{"object":"whatsapp_business_account","entry":[...]}`
 * Export it from Railway with the filter `WaEvent` over the send window.
 *
 * For each PENDING participant of the send whose phone matches a `recipient_id`
 * in the events, the script writes the WaMessage row through `handleWaMessages`
 * (the same path the send would have used, so the campaign map, conversation
 * and metered window all land) and then applies the receipts through
 * `bulkUpdateStatuses` (the same function the Kafka consumer runs), so
 * participant status, campaign stats, send stats and per-message stats all
 * catch up exactly as they would have live. Nothing is re-sent.
 *
 * Needs DATABASE_URL, REDIS_URL and KAFKA_URL in the environment, because the
 * modules it reuses connect at import time. Run it from the worker's
 * environment, or with those variables pointed at production.
 */
import "dotenv/config";

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

import { PlatformType } from "../generated/prisma/enums.js";
import { handleWaMessages } from "../src/modules/whatsapp/inbox/message/wamessage.controller.js";
import { getWaMessageByMessageId } from "../src/modules/whatsapp/inbox/message/wamessage.service.js";
import { createTemplateMessage } from "../src/modules/whatsapp/whatsappSurvey/wasurvey.utils.js";
import { channelDigits } from "../src/utils/channelIdentifier.js";
import prisma from "../src/utils/prisma.js";
import { bulkUpdateStatuses } from "../src/workers/shared/whatsapp/index.js";

interface Args {
  send: string;
  events: string;
  apply: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--send") args.send = argv[++i];
    else if (a === "--events") args.events = argv[++i];
    else if (a === "--apply") args.apply = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!args.send || !args.events) {
    throw new Error("Usage: --send <campaignSendId> --events <file.ndjson> [--apply]");
  }
  return args as Args;
}

interface Receipt {
  status: string;
  timestamp: string;
  errors?: unknown;
  pricing?: unknown;
}

interface SeenMessage {
  messageId: string;
  recipientDigits: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  receipts: Receipt[];
}

const WA_EVENT_MARKER = "WaEvent => ";

/** The webhook body out of one log line, whichever shape the line has. */
function extractWaEvent(line: string): any | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;
  let outer: any;
  try {
    outer = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (outer?.object === "whatsapp_business_account") return outer;
  const message: unknown = outer?.message;
  if (typeof message !== "string") return undefined;
  const at = message.indexOf(WA_EVENT_MARKER);
  if (at < 0) return undefined;
  try {
    return JSON.parse(message.slice(at + WA_EVENT_MARKER.length));
  } catch {
    return undefined;
  }
}

/** Every status receipt in the file, grouped by wamid. */
async function readReceipts(path: string): Promise<Map<string, SeenMessage>> {
  const seen = new Map<string, SeenMessage>();
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    const event = extractWaEvent(line);
    if (!event) continue;
    for (const entry of event.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change?.value;
        const metadata = value?.metadata ?? {};
        for (const status of value?.statuses ?? []) {
          if (!status?.id || !status?.status || !status?.recipient_id) continue;
          const message: SeenMessage = seen.get(status.id) ?? {
            messageId: status.id,
            recipientDigits: channelDigits(String(status.recipient_id)),
            phoneNumberId: metadata.phone_number_id,
            displayPhoneNumber: metadata.display_phone_number,
            receipts: [],
          };
          // Meta's timestamps are epoch seconds.
          const ts = status.timestamp
            ? new Date(Number(status.timestamp) * 1000).toISOString()
            : new Date().toISOString();
          message.receipts.push({
            status: String(status.status).toLowerCase(),
            timestamp: ts,
            errors: status.errors,
            pricing: status.pricing,
          });
          seen.set(status.id, message);
        }
      }
    }
  }
  return seen;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const send = await prisma.campaignSend.findUnique({
    where: { id: args.send },
    select: {
      id: true,
      campaignId: true,
      campaign: {
        select: {
          id: true,
          teamId: true,
          waTemplate: { select: { data: true } },
          team: { select: { orgId: true } },
        },
      },
    },
  });
  if (!send) throw new Error(`CampaignSend ${args.send} not found`);
  const template = send.campaign.waTemplate?.data as
    | { name?: string; language?: string }
    | null
    | undefined;
  if (!template?.name || !template.language) {
    throw new Error(`Campaign ${send.campaignId} has no usable template`);
  }
  const orgId = send.campaign.team.orgId;

  const pending = await prisma.campaignParticipant.findMany({
    where: { campaignId: send.campaignId, status: "PENDING" },
    select: { id: true, contact: { select: { id: true, phone: true } } },
  });
  const byDigits = new Map<string, (typeof pending)[number]>();
  for (const p of pending) {
    const digits = channelDigits(p.contact.phone);
    if (digits) byDigits.set(digits, p);
  }

  const seen = await readReceipts(args.events);
  console.log(
    `send ${send.id}: ${pending.length} PENDING participants; ${seen.size} distinct wamids in events`,
  );

  // Numbers the events were sent from, resolved to what the send path stores.
  const settings = await prisma.whatsappSettings.findMany({
    where: { orgId },
    select: { phoneId: true, phone: true },
  });
  const phoneByPhoneId = new Map(settings.map((s) => [s.phoneId, s.phone]));

  let matched = 0;
  let alreadyRecorded = 0;
  let created = 0;
  let replayed = 0;
  const unmatchedParticipants = new Set(byDigits.keys());
  const statusBatch: { id: string; value: any }[] = [];

  for (const message of seen.values()) {
    const participant = byDigits.get(message.recipientDigits);
    if (!participant) continue;
    matched++;
    unmatchedParticipants.delete(message.recipientDigits);

    const sourceIdentifier =
      (message.phoneNumberId && phoneByPhoneId.get(message.phoneNumberId)) ||
      message.displayPhoneNumber ||
      message.phoneNumberId;

    const existing = await getWaMessageByMessageId(message.messageId);
    if (existing) {
      alreadyRecorded++;
    } else if (args.apply) {
      const payload = createTemplateMessage(participant.contact.phone ?? message.recipientDigits, {
        name: template.name,
        language: { code: template.language },
        components: [],
      } as never);
      await handleWaMessages(
        "send",
        payload,
        participant.contact.phone ?? message.recipientDigits,
        orgId,
        PlatformType.WHATSAPP,
        sourceIdentifier,
        undefined,
        message.messageId,
        undefined,
        false,
        send.campaign.teamId,
        "CAMPAIGN",
        false,
        false,
        {},
        {
          participantId: participant.id,
          campaignSendId: send.id,
          templateData: template,
        },
      );
      created++;
    } else {
      created++;
    }

    for (const [i, receipt] of message.receipts.entries()) {
      statusBatch.push({
        id: `${message.messageId}:${i}`,
        value: { messageId: message.messageId, ...receipt },
      });
    }
  }

  if (args.apply && statusBatch.length) {
    // Same batch size the consumer sees from Kafka, so the query shapes match.
    for (let i = 0; i < statusBatch.length; i += 500) {
      const chunk = statusBatch.slice(i, i + 500);
      const processed = await bulkUpdateStatuses(chunk);
      replayed += processed.length;
    }
  }

  console.log(
    [
      `matched ${matched} wamids to PENDING participants`,
      `${alreadyRecorded} already had a WaMessage row`,
      `${created} rows ${args.apply ? "created" : "would be created"}`,
      `${statusBatch.length} receipts ${args.apply ? `replayed (${replayed} applied)` : "would be replayed"}`,
      `${unmatchedParticipants.size} PENDING participants had no receipt in the events file`,
    ].join("\n"),
  );
  if (!args.apply) console.log("\nDry run. Re-run with --apply to write.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  // Queue/Redis handles opened at import keep the process alive otherwise.
  process.exit(0);
}
