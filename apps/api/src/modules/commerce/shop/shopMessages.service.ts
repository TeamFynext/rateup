import { TemplateType } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  bodyTextOf,
  isVersionOf,
  metaStatusToStep,
  storedTemplate,
  submitTextTemplate,
  type TextTemplateStatus,
} from "../../meta/whatsapp/templates/textTemplate.service.js";
import { SHOP_MESSAGE_CATALOG, shopBodyProblem, templateBodyFor } from "./messageCatalog.js";
import { notificationSetting, templateQuickReplies } from "./notify.js";
import { ShopError } from "./shop.errors.js";
import type { ShopNotificationEvent, ShopNotificationSettings } from "./shop.types.js";
import { mergeNotifications } from "./store.service.js";

/**
 * Settings › Messages: a store writes the words for one of its automatic messages. The words
 * go out in an open WhatsApp chat (the 24-hour window) and on Instagram and Messenger, and
 * saving them involves no one else.
 *
 * Outside the window only an approved template reaches a customer. The store either picks a
 * template it already has, or asks for one made from its words (`makeTemplate`), the way
 * loyalty's automatic messages work. Without either, the message goes to open chats only.
 * A template that can't be made (no WhatsApp number yet, Meta refused it) never loses the
 * words; the answer says why.
 */

interface StoreLike {
  id: string;
  orgId: string;
  notifications: unknown;
}

export interface ShopMessageView {
  key: ShopNotificationEvent;
  /** The name the shop submits this message's template under (`…_v2` once re-versioned). */
  baseTemplateName: string;
  params: readonly string[];
  defaultBody: string;
  defaultOn: boolean;
  quickReplies: readonly string[];
  enabled: boolean;
  body: string;
  customBody: boolean;
  waTemplateId: string | null;
  /** Where the message's template stands with Meta; null without one. */
  templateStatus: TextTemplateStatus | "draft" | null;
  /** The template's own name, which may be one the store picked by hand. */
  templateName: string | null;
  /** `own`: made from the store's words; `picked`: one the store chose from its library. */
  templateKind: "own" | "picked" | null;
  /** The template's text, which is what a customer outside the window reads. */
  templateBody: string | null;
  /** The template's quick-reply buttons, by title. */
  templateQuickReplies: string[];
  /** The template was made from words the store has changed since. */
  templateOutdated: boolean;
}

export interface SaveShopMessageResult {
  message: ShopMessageView;
  template: { templateId: string; templateName: string; status: TextTemplateStatus } | null;
  /** Why no template carries the words; the words themselves were saved. */
  templateError: string | null;
}

export function isShopMessageKey(key: string): key is ShopNotificationEvent {
  return Object.hasOwn(SHOP_MESSAGE_CATALOG, key);
}

interface TemplateData {
  status?: string;
  name?: string;
  components?: unknown;
}

async function templateStatuses(orgId: string, ids: string[]) {
  if (!ids.length) return new Map<string, TemplateData>();
  const rows = await prisma.waTemplate.findMany({
    where: { orgId, id: { in: ids } },
    select: { id: true, data: true },
  });
  return new Map(rows.map((r) => [r.id, (r.data ?? {}) as TemplateData]));
}

const sameWords = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

function view(
  key: ShopNotificationEvent,
  notifications: unknown,
  templates: Map<string, TemplateData>,
): ShopMessageView {
  const d = SHOP_MESSAGE_CATALOG[key];
  const s = notificationSetting(notifications, key);
  const t = s.waTemplateId ? templates.get(s.waTemplateId) : undefined;
  const map = ((notifications ?? {}) as ShopNotificationSettings)[key]?.templateMap;
  const own = !!t && !!map && map.waTemplateId === s.waTemplateId;
  const templateBody = t ? bodyTextOf(t.components) : null;
  const built = own ? templateBodyFor(key, s.body) : null;
  return {
    key,
    baseTemplateName: d.templateName,
    params: d.params,
    defaultBody: d.defaultBody,
    defaultOn: d.defaultOn,
    quickReplies: d.quickReplies ?? [],
    enabled: s.enabled,
    body: s.body,
    customBody: s.customBody,
    waTemplateId: s.waTemplateId,
    templateStatus: t ? (t.status === "DRAFT" ? "draft" : metaStatusToStep(t.status)) : null,
    templateName: t?.name ?? null,
    templateKind: t ? (own ? "own" : "picked") : null,
    templateBody,
    templateQuickReplies: t ? templateQuickReplies(t.components) : [],
    templateOutdated:
      !!built && !("problem" in built) && !!templateBody && !sameWords(built.text, templateBody),
  };
}

/** Every automatic message, with what the store set and its template's standing. */
export async function listShopMessages(store: StoreLike): Promise<ShopMessageView[]> {
  const keys = Object.keys(SHOP_MESSAGE_CATALOG) as ShopNotificationEvent[];
  const ids = keys
    .map((k) => notificationSetting(store.notifications, k).waTemplateId)
    .filter((id): id is string => !!id);
  const templates = await templateStatuses(store.orgId, [...new Set(ids)]);
  return keys.map((k) => view(k, store.notifications, templates));
}

/**
 * The template the message points at, when it is the shop's own (`shop_order_shipped`,
 * `…_v2`). One the store picked by hand may be shared with other messages, so it is never
 * edited in place: a new one is made and the message moves to it.
 */
async function ownTemplate(orgId: string, key: ShopNotificationEvent, notifications: unknown) {
  const all = (notifications ?? {}) as ShopNotificationSettings;
  const id = all[key]?.waTemplateId;
  if (!id) return null;
  const row = await prisma.waTemplate.findFirst({ where: { id, orgId } });
  if (!row) return null;
  const current = storedTemplate(row);
  return isVersionOf(current.data.name, SHOP_MESSAGE_CATALOG[key].templateName) ? current : null;
}

async function saveNotification(
  store: StoreLike,
  key: ShopNotificationEvent,
  patch: NonNullable<ShopNotificationSettings[ShopNotificationEvent]>,
) {
  const fresh = await prisma.shopStore.findUnique({
    where: { id: store.id },
    select: { notifications: true },
  });
  const notifications = mergeNotifications(fresh?.notifications, { [key]: patch });
  await prisma.shopStore.update({ where: { id: store.id }, data: { notifications } });
  return notifications;
}

export async function saveShopMessage(input: {
  store: StoreLike;
  key: string;
  /** The store's words; null goes back to the catalog's. */
  body: string | null;
  enabled?: boolean;
  /** Also make (or update) a WhatsApp template from the words and use it outside the window. */
  makeTemplate?: boolean;
}): Promise<SaveShopMessageResult> {
  const { store } = input;
  if (!isShopMessageKey(input.key)) throw new ShopError("NOT_FOUND", "No such message");
  const key = input.key;
  const body = input.body?.trim() ? input.body.trim() : null;
  if (body) {
    const problem = shopBodyProblem(key, body);
    if (problem) throw new ShopError("INVALID", problem);
  }

  let notifications = await saveNotification(store, key, {
    body,
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
  });
  const words = notificationSetting(notifications, key).body;

  const finish = async (
    template: SaveShopMessageResult["template"],
    templateError: string | null,
  ): Promise<SaveShopMessageResult> => {
    const ids = [notificationSetting(notifications, key).waTemplateId].filter(
      (id): id is string => !!id,
    );
    return {
      message: view(key, notifications, await templateStatuses(store.orgId, ids)),
      template,
      templateError,
    };
  };

  if (!input.makeTemplate) return finish(null, null);

  const connected = await prisma.whatsappSettings.count({ where: { orgId: store.orgId } });
  if (!connected) {
    return finish(null, "Connect a WhatsApp number to send this outside the 24-hour window");
  }

  const built = templateBodyFor(key, words);
  if ("problem" in built) return finish(null, built.problem);

  try {
    const definition = SHOP_MESSAGE_CATALOG[key];
    const result = await submitTextTemplate({
      orgId: store.orgId,
      baseName: definition.templateName,
      body: built.text,
      current: await ownTemplate(store.orgId, key, notifications),
      buttons: (definition.quickReplies ?? []).map((text) => ({ type: "QUICK_REPLY", text })),
      examples: built.examples,
      templateType: TemplateType.GENERAL_NOTIFICATION,
    });
    notifications = await saveNotification(store, key, {
      waTemplateId: result.templateId,
      templateMap: { waTemplateId: result.templateId, params: built.params },
    });
    return finish(
      { templateId: result.templateId, templateName: result.templateName, status: result.status },
      null,
    );
  } catch (err) {
    log.warn({ err, orgId: store.orgId, key }, "Shop message template could not be submitted");
    return finish(
      null,
      `WhatsApp didn't take the template: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
