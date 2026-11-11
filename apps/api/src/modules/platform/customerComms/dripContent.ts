import { z } from "zod";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { DripEmail, DripStep } from "./drip.catalogue.js";

const PLACEHOLDERS = new Set(["name", "org"]);

/** `{name}` and `{org}` are filled per person; any other `{word}` would go out as typed. */
const knownPlaceholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].every((m) => PLACEHOLDERS.has(m[1]));
const placeholderMessage = "Only {name} and {org} can be filled in.";

const copy = (max: number) =>
  z.string().trim().max(max).refine(knownPlaceholders, placeholderMessage);

/** A path on the web app (made absolute when sent) or a full https link. */
const link = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/\S+$/.test(v),
    "Use a path like /dashboard/setup or a full https:// link.",
  );

export const dripEmailSchema = z
  .object({
    subject: copy(200).pipe(z.string().min(1)),
    preview: copy(200),
    title: copy(120),
    body: copy(20_000).pipe(z.string().min(1)),
    cta: z.object({ label: copy(40).pipe(z.string().min(1)), path: link }).optional(),
    highlights: z
      .array(
        z.object({
          title: copy(80).pipe(z.string().min(1)),
          description: copy(300).pipe(z.string().min(1)),
          path: link.optional(),
        }),
      )
      .max(6)
      .optional(),
    plain: z.boolean().optional(),
  })
  .refine((e) => e.plain || e.title.length > 0, {
    message: "A designed email needs a title.",
    path: ["title"],
  });

/** The saved wording, or the catalogue's when there is none or it no longer validates. */
export function effectiveEmail(step: DripStep, saved: unknown): DripEmail {
  if (saved == null) return step.email;
  const parsed = dripEmailSchema.safeParse(saved);
  if (parsed.success) return parsed.data;
  log.warn(
    { key: step.key, issues: parsed.error.issues },
    "drip: saved email invalid, using default",
  );
  return step.email;
}

export async function dripEmailFor(step: DripStep): Promise<DripEmail> {
  const row = await prisma.dripStepSetting.findUnique({
    where: { key: step.key },
    select: { email: true },
  });
  return effectiveEmail(step, row?.email);
}

export const dripWhatsappSchema = z.object({
  template: z.string().trim().min(1).max(512).nullable(),
});

/** The template this step sends, or null when it sends no WhatsApp. */
export function effectiveWhatsapp(step: DripStep, saved: unknown): string | null {
  const fallback = step.whatsapp?.template ?? null;
  if (saved == null) return fallback;
  const parsed = dripWhatsappSchema.safeParse(saved);
  if (parsed.success) return parsed.data.template;
  log.warn({ key: step.key }, "drip: saved WhatsApp choice invalid, using default");
  return fallback;
}

export async function dripWhatsappFor(step: DripStep): Promise<string | null> {
  const row = await prisma.dripStepSetting.findUnique({
    where: { key: step.key },
    select: { whatsapp: true },
  });
  return effectiveWhatsapp(step, row?.whatsapp);
}
