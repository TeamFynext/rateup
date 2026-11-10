import { describe, expect, test } from "vite-plus/test";

import type { WaMessageBody } from "../../../../types/whatsapp.types.js";
import { buildWaWebhookRecords } from "./waWebhookRecords.js";

const PHONE_ID = "259643180556398";
const metadata = { display_phone_number: "15551323034", phone_number_id: PHONE_ID };

const message = (from: string, id: string) => ({
  from,
  id,
  timestamp: "1790056876",
  type: "text",
  text: { body: `hi from ${from}` },
});
const contact = (waId: string) => ({ profile: { name: `name-${waId}` }, wa_id: waId });
const status = (id: string, kind: string, recipient = "911") => ({
  id,
  status: kind,
  timestamp: "1790056876",
  recipient_id: recipient,
});

function delivery(...entries: { id?: string; changes: { field: string; value: object }[] }[]) {
  return {
    object: "whatsapp_business_account",
    entry: entries.map((entry) => ({ id: "waba-1", ...entry })),
  } as unknown as WaMessageBody;
}

const parsed = (value: string) => JSON.parse(value) as Record<string, any>;

describe("buildWaWebhookRecords", () => {
  test("sends a one-customer delivery as the raw bytes, keyed by the customer", () => {
    const body = delivery({
      changes: [
        {
          field: "messages",
          value: { metadata, contacts: [contact("911")], messages: [message("911", "m1")] },
        },
      ],
    });
    const raw = JSON.stringify(body);

    expect(buildWaWebhookRecords(body, raw)).toEqual([{ key: "911", value: raw }]);
  });

  test("splits a change carrying two customers' messages, one record each", () => {
    const body = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            contacts: [contact("911"), contact("922")],
            messages: [message("911", "m1"), message("922", "m2"), message("911", "m3")],
          },
        },
      ],
    });

    const records = buildWaWebhookRecords(body, JSON.stringify(body));

    expect(records.map((r) => r.key)).toEqual(["911", "922"]);
    const first = parsed(records[0]!.value).entry[0].changes[0].value;
    expect(first.messages.map((m: { id: string }) => m.id)).toEqual(["m1", "m3"]);
    expect(first.contacts).toEqual([contact("911")]);
    expect(first.metadata).toEqual(metadata);
    const second = parsed(records[1]!.value).entry[0].changes[0].value;
    expect(second.messages.map((m: { id: string }) => m.id)).toEqual(["m2"]);
    expect(second.contacts).toEqual([contact("922")]);
  });

  test("keeps a status-only change whole, keyed by the business number", () => {
    const body = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            statuses: [status("a", "sent", "911"), status("b", "read", "922")],
          },
        },
      ],
    });
    const raw = JSON.stringify(body);

    expect(buildWaWebhookRecords(body, raw)).toEqual([{ key: PHONE_ID, value: raw }]);
  });

  test("gives every entry and change a record of its own", () => {
    const body = delivery(
      {
        changes: [
          { field: "messages", value: { metadata, messages: [message("911", "m1")] } },
          { field: "messages", value: { metadata, statuses: [status("a", "delivered")] } },
        ],
      },
      {
        id: "waba-2",
        changes: [{ field: "messages", value: { metadata, messages: [message("933", "m2")] } }],
      },
    );

    const records = buildWaWebhookRecords(body, JSON.stringify(body));

    expect(records.map((r) => r.key)).toEqual(["911", PHONE_ID, "933"]);
    for (const record of records) {
      const value = parsed(record.value);
      expect(value.object).toBe("whatsapp_business_account");
      expect(value.entry).toHaveLength(1);
      expect(value.entry[0].changes).toHaveLength(1);
    }
    expect(parsed(records[2]!.value).entry[0].id).toBe("waba-2");
  });

  test("separates statuses from messages that share a change", () => {
    const body = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            messages: [message("911", "m1")],
            statuses: [status("a", "read")],
          },
        },
      ],
    });

    const records = buildWaWebhookRecords(body);

    expect(records.map((r) => r.key)).toEqual(["911", PHONE_ID]);
    expect(parsed(records[0]!.value).entry[0].changes[0].value.statuses).toBeUndefined();
    expect(parsed(records[1]!.value).entry[0].changes[0].value.messages).toBeUndefined();
  });

  test("keys echoes by the customer written to, and hand-overs by the customer", () => {
    const body = delivery({
      changes: [
        {
          field: "smb_message_echoes",
          value: { metadata, message_echoes: [{ from: "15551323034", to: "944", id: "e1" }] },
        },
        {
          field: "messaging_handovers",
          value: { metadata, sender: { phone_number: "955" }, control_passed: {} },
        },
      ],
    });

    expect(buildWaWebhookRecords(body).map((r) => r.key)).toEqual(["944", "955"]);
  });

  test("keys account-level changes by the business number, else the WABA", () => {
    const body = delivery({
      changes: [
        { field: "message_template_status_update", value: { message_template_id: 1 } },
        { field: "calls", value: { metadata, calls: [{ id: "c1", from: "966" }] } },
      ],
    });

    expect(buildWaWebhookRecords(body).map((r) => r.key)).toEqual(["waba-1", PHONE_ID]);
  });

  test("has nothing to publish for a delivery without changes", () => {
    expect(buildWaWebhookRecords({ object: "whatsapp_business_account" } as never)).toEqual([]);
    expect(buildWaWebhookRecords(delivery({ changes: [] }))).toEqual([]);
    expect(buildWaWebhookRecords(null as never)).toEqual([]);
  });

  test("keys a customer by BSUID, so a webhook without their phone lands on the same partition", () => {
    const withPhone = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            contacts: [{ profile: { name: "A" }, wa_id: "911", user_id: "IN.111" }],
            messages: [{ ...message("911", "m1"), from_user_id: "IN.111" }],
          },
        },
      ],
    });
    const withoutPhone = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            contacts: [{ profile: { name: "A", username: "ann" }, user_id: "IN.111" }],
            messages: [{ ...message("", "m2"), from: undefined, from_user_id: "IN.111" }],
          },
        },
      ],
    });
    expect(buildWaWebhookRecords(withPhone).map((r) => r.key)).toEqual(["IN.111"]);
    expect(buildWaWebhookRecords(withoutPhone).map((r) => r.key)).toEqual(["IN.111"]);
  });

  test("splits a batch by BSUID and narrows contacts to each sender", () => {
    const body = delivery({
      changes: [
        {
          field: "messages",
          value: {
            metadata,
            contacts: [
              { profile: { name: "A" }, user_id: "IN.111" },
              { profile: { name: "B" }, wa_id: "922", user_id: "IN.222" },
            ],
            messages: [
              { ...message("", "m1"), from: undefined, from_user_id: "IN.111" },
              { ...message("922", "m2"), from_user_id: "IN.222" },
            ],
          },
        },
      ],
    });
    const records = buildWaWebhookRecords(body);
    expect(records.map((r) => r.key)).toEqual(["IN.111", "IN.222"]);
    const second = parsed(records[1]!.value).entry[0].changes[0].value;
    expect(second.contacts).toEqual([{ profile: { name: "B" }, wa_id: "922", user_id: "IN.222" }]);
  });
});
