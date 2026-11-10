import { TemplateType } from "../../../../generated/prisma/client.js";
import { withCache } from "../../../../utils/cache.js";
import { log } from "../../../../utils/logger.js";
import { getWaSettings } from "../settings/settings.service.js";
import { callMetaApi } from "../wa_axios.js";
import { fetchTemplate, saveTemplate } from "./templates.service.js";
import type { CreateFromLibraryInput, TemplateLibraryQuery } from "./templateLibrary.schema.js";

/**
 * Meta's template library: ready-written UTILITY and AUTHENTICATION templates. One
 * created from the library with its text unchanged may skip review, but only when
 * Meta marks the entry `pre_approved` (none were on our accounts on 2026-10-26).
 *
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-library
 */

/** Library pages change rarely; an hour keeps the gallery quick without going stale. */
const LIBRARY_CACHE_SECONDS = 60 * 60;
const PAGE_SIZE = 30;

export interface LibraryButton {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
}

export interface LibraryRequiredInputs {
  /** Buttons that need a URL or phone number of ours, by position in `buttons`. */
  buttons: { index: number; type: string; text?: string; needs: "url" | "phone_number" }[];
  /** Named body values baked in as fixed text when the template is created. */
  body_inputs: { param_name: string }[];
}

/** One library entry, in the shape the UI reads. */
export interface LibraryTemplate {
  name: string;
  language: string;
  category: string;
  topic: string | null;
  usecase: string | null;
  industry: string[];
  pre_approved: boolean;
  header: string | null;
  header_type: string | null;
  body: string;
  body_params: string[];
  footer: string | null;
  buttons: LibraryButton[];
  required_inputs: LibraryRequiredInputs;
}

export interface LibraryPage {
  data: LibraryTemplate[];
  /** Cursor for the next page, when there is one. */
  after: string | null;
}

type RawEntry = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length ? value : null;
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * Meta's raw entry (`name`, `buttons[]`, …) or the MCP's view of it (`library_template_name`,
 * `required_inputs`), as one shape. What a button needs is derived from its type when
 * the entry does not say.
 */
export function normalizeLibraryEntry(raw: RawEntry): LibraryTemplate {
  const buttons: LibraryButton[] = (Array.isArray(raw.buttons) ? raw.buttons : []).map(
    (b: RawEntry) => ({
      type: String(b.type ?? "").toUpperCase(),
      text: str(b.text) ?? undefined,
      url: str(b.url) ?? undefined,
      phone_number: str(b.phone_number) ?? undefined,
    }),
  );

  const given = raw.required_inputs as Partial<LibraryRequiredInputs> | undefined;
  const requiredButtons =
    given?.buttons ??
    buttons.flatMap((b, index): LibraryRequiredInputs["buttons"] => {
      if (b.type === "URL") return [{ index, type: b.type, text: b.text, needs: "url" as const }];
      if (b.type === "PHONE_NUMBER") {
        return [{ index, type: b.type, text: b.text, needs: "phone_number" as const }];
      }
      return [];
    });

  const header = str(raw.header);
  return {
    name: str(raw.library_template_name) ?? str(raw.name) ?? "",
    language: str(raw.language) ?? "en_US",
    category: (str(raw.category) ?? "UTILITY").toUpperCase(),
    topic: str(raw.topic),
    usecase: str(raw.usecase),
    industry: strList(raw.industry),
    pre_approved: raw.pre_approved === true,
    header,
    header_type: str(raw.header_type) ?? (header ? "TEXT" : null),
    body: str(raw.body) ?? "",
    body_params: strList(raw.body_params),
    footer: str(raw.footer),
    buttons,
    required_inputs: {
      buttons: requiredButtons,
      body_inputs: Array.isArray(given?.body_inputs) ? given.body_inputs : [],
    },
  };
}

/**
 * Browses the library with the org's token, scoped to the channel's account so entries
 * it cannot use (India-only ones, say) stay out. Cached per account and query.
 */
export async function browseTemplateLibrary(
  orgId: string,
  query: TemplateLibraryQuery,
): Promise<LibraryPage> {
  const waSettings = await getWaSettings(orgId, query.whatsappSettingsPhoneId);
  if (!waSettings?.accessToken) throw new Error("No WhatsApp account connected");

  const params: Record<string, string> = { limit: String(PAGE_SIZE) };
  if (waSettings.wabaId) params.waba_id = waSettings.wabaId;
  if (query.search) params.search = query.search;
  if (query.language) params.language = query.language;
  if (query.category?.length) params.category = query.category.join(",");
  if (query.topic?.length) params.topic = query.topic.join(",");
  if (query.usecase?.length) params.usecase = query.usecase.join(",");
  if (query.industry?.length) params.industry = query.industry.join(",");
  if (query.after) params.after = query.after;

  const key = `templateLibrary:${waSettings.wabaId ?? orgId}:${JSON.stringify(params)}`;
  return withCache(key, LIBRARY_CACHE_SECONDS, async () => {
    const res = await callMetaApi(
      "/message_template_library",
      "GET",
      waSettings.accessToken,
      undefined,
      {},
      {},
      params,
    );
    const body = res.data as {
      data?: RawEntry[];
      paging?: { next?: string; cursors?: { after?: string } };
    };
    return {
      data: (body.data ?? []).map(normalizeLibraryEntry).filter((entry) => entry.name),
      after: body.paging?.next ? (body.paging.cursors?.after ?? null) : null,
    };
  });
}

/** Meta's `library_template_button_inputs`, in the entry's button order. */
export function toMetaButtonInputs(buttons: CreateFromLibraryInput["buttons"]) {
  return [...(buttons ?? [])]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((b) => {
      switch (b.type) {
        case "URL":
          return {
            type: "URL",
            url: {
              base_url: b.url,
              // Meta wants a whole example URL, not just the value of {{1}}.
              ...(b.url?.includes("{{1}}") && b.urlSuffixExample
                ? { url_suffix_example: b.url.replace("{{1}}", b.urlSuffixExample) }
                : {}),
            },
          };
        case "PHONE_NUMBER":
          return { type: "PHONE_NUMBER", phone_number: b.phoneNumber };
        default:
          return { type: b.type };
      }
    });
}

/**
 * Creates a template from a library entry on the channel's account and stores it.
 * The wording comes from Meta; only button URLs and phone numbers (and the entry's
 * body inputs) are ours. Returns the stored row.
 */
export async function createTemplateFromLibrary(orgId: string, input: CreateFromLibraryInput) {
  const waSettings = await getWaSettings(orgId, input.whatsappSettingsPhoneId);
  if (!waSettings?.wabaId || !waSettings.accessToken) {
    throw new Error("No WhatsApp account connected");
  }

  const body = {
    name: input.name,
    language: input.language,
    category: input.category ?? "UTILITY",
    library_template_name: input.libraryTemplateName,
    ...(input.buttons?.length
      ? { library_template_button_inputs: toMetaButtonInputs(input.buttons) }
      : {}),
    ...(input.bodyInputs && Object.keys(input.bodyInputs).length
      ? { library_template_body_inputs: input.bodyInputs }
      : {}),
  };
  await callMetaApi(
    `/${waSettings.wabaId}/message_templates`,
    "POST",
    waSettings.accessToken,
    body,
  );

  // The create answer carries only id, status and category; the library's text comes
  // from reading the new template back.
  const created = await fetchTemplate(input.name, orgId, waSettings.phoneId ?? undefined);
  if (!created) throw new Error("Meta created the template but it could not be read back");

  // Kept on the stored template so the editor can say where it came from; Meta returns
  // the same field on GET, so a later sync keeps it.
  const template = { ...created, library_template_name: input.libraryTemplateName };
  const phoneId = waSettings.phoneId ?? input.whatsappSettingsPhoneId;
  const saved = await saveTemplate(
    template,
    orgId,
    { whatsappSettingsPhoneId: phoneId },
    input.templateType ?? TemplateType.GENERAL_NOTIFICATION,
    undefined,
    phoneId,
  );
  log.info(
    { orgId, templateId: saved.id, library: input.libraryTemplateName },
    "Template created from Meta's library",
  );
  return saved;
}
