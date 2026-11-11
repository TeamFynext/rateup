/**
 * The Page's Messenger profile: what people see before they type anything — the Get
 * Started button, its greeting, ice breakers and the persistent menu. Meta holds it; we
 * read it back from Meta every time rather than keeping a copy that could go stale when
 * another tool changes it.
 */

import { callMetaApi } from "../whatsapp/wa_axios.js";

export interface MessengerIceBreaker {
  question: string;
  payload: string;
}

export type MessengerMenuItem =
  | { type: "postback"; title: string; payload: string }
  | { type: "web_url"; title: string; url: string };

export interface MessengerProfile {
  /** What a Get Started tap sends; null when the Page has no button. */
  getStarted: string | null;
  greeting: string | null;
  iceBreakers: MessengerIceBreaker[];
  persistentMenu: MessengerMenuItem[];
}

export const MESSENGER_PROFILE_FIELDS = [
  "get_started",
  "greeting",
  "ice_breakers",
  "persistent_menu",
] as const;
export type MessengerProfileField = (typeof MESSENGER_PROFILE_FIELDS)[number];

const DEFAULT_LOCALE = "default";

interface LocaleEntry {
  locale?: string;
}

/** We only edit the default locale; one set up for another locale is read when it is all there is. */
function defaultEntry<T extends LocaleEntry>(entries: unknown): T | undefined {
  if (!Array.isArray(entries)) return undefined;
  const list = entries as T[];
  return list.find((entry) => entry.locale === DEFAULT_LOCALE) ?? list[0];
}

function readIceBreakers(raw: unknown): MessengerIceBreaker[] {
  if (!Array.isArray(raw)) return [];
  // Meta's current shape nests the questions per locale; Pages set up before that keep
  // the flat list.
  const nested = defaultEntry<LocaleEntry & { call_to_actions?: unknown }>(raw);
  const list = nested && "call_to_actions" in nested ? nested.call_to_actions : raw;
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is MessengerIceBreaker => typeof item?.question === "string")
    .map((item) => ({ question: item.question, payload: item.payload ?? "" }));
}

function readMenu(raw: unknown): MessengerMenuItem[] {
  const entry = defaultEntry<LocaleEntry & { call_to_actions?: unknown }>(raw);
  if (!Array.isArray(entry?.call_to_actions)) return [];
  const items: MessengerMenuItem[] = [];
  for (const item of entry.call_to_actions as Array<Record<string, string>>) {
    // Nested menus are no longer supported by Meta, so only these two kinds can be live.
    if (item.type === "postback") {
      items.push({ type: "postback", title: item.title, payload: item.payload ?? "" });
    } else if (item.type === "web_url") {
      items.push({ type: "web_url", title: item.title, url: item.url ?? "" });
    }
  }
  return items;
}

/** Meta's read-back, flattened to the one locale RateUp edits. */
export function parseMessengerProfile(body: unknown): MessengerProfile {
  const data = (body as { data?: unknown } | null | undefined)?.data;
  const profile = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;

  const getStarted = (profile?.get_started as { payload?: string } | undefined)?.payload;
  const greeting = defaultEntry<LocaleEntry & { text?: string }>(profile?.greeting)?.text;

  return {
    getStarted: getStarted ?? null,
    greeting: greeting ?? null,
    iceBreakers: readIceBreakers(profile?.ice_breakers),
    persistentMenu: readMenu(profile?.persistent_menu),
  };
}

export async function getMessengerProfile(pageAccessToken: string): Promise<MessengerProfile> {
  const response = await callMetaApi(
    "/me/messenger_profile",
    "GET",
    pageAccessToken,
    undefined,
    {},
    {},
    { fields: MESSENGER_PROFILE_FIELDS.join(",") },
  );
  return parseMessengerProfile(response.data);
}

export type MessengerProfileUpdate = Partial<{
  getStarted: string;
  greeting: string;
  iceBreakers: MessengerIceBreaker[];
  persistentMenu: MessengerMenuItem[];
}>;

/** The Messenger Profile API body for the fields being set; the others are left alone. */
export function messengerProfileBody(update: MessengerProfileUpdate): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (update.getStarted !== undefined) {
    body.get_started = { payload: update.getStarted };
  }
  if (update.greeting !== undefined) {
    body.greeting = [{ locale: DEFAULT_LOCALE, text: update.greeting }];
  }
  if (update.iceBreakers !== undefined) {
    body.ice_breakers = [{ locale: DEFAULT_LOCALE, call_to_actions: update.iceBreakers }];
  }
  if (update.persistentMenu !== undefined) {
    body.persistent_menu = [
      {
        locale: DEFAULT_LOCALE,
        composer_input_disabled: false,
        call_to_actions: update.persistentMenu,
      },
    ];
  }
  return body;
}

export async function setMessengerProfile(
  pageAccessToken: string,
  update: MessengerProfileUpdate,
): Promise<void> {
  await callMetaApi("/me/messenger_profile", "POST", pageAccessToken, messengerProfileBody(update));
}

export async function deleteMessengerProfileFields(
  pageAccessToken: string,
  fields: MessengerProfileField[],
): Promise<void> {
  await callMetaApi("/me/messenger_profile", "DELETE", pageAccessToken, { fields });
}
