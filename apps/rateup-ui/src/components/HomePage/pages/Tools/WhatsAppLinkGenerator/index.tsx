import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";
import { buildWhatsAppLink, WHATSAPP_PREFILL_MAX_LENGTH } from "@/utils/whatsappLink.ts";

import {
  CopyButton,
  FaqSection,
  Field,
  HowItWorks,
  PhoneControl,
  RelatedTools,
  ResultPanel,
  TextAreaControl,
  ToolCard,
  ToolContainer,
  ToolCta,
  WhatsAppLinkButton,
} from "../shared/ToolSections.tsx";

const SLUG = "whatsapp-link-generator";

/** Soft cap surfaced in the counter — some in-app browsers truncate beyond this. */
const RECOMMENDED_LENGTH = 300;

export default function WhatsAppLinkGenerator() {
  const tool = getToolBySlug(SLUG);
  // PhoneControl hands back a complete E.164 number, so there is no separate
  // dial code to track. An empty field is not an error — the result stays blank
  // and the validation message hidden until the visitor has actually typed.
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Hi! I'd like to know more about your products.");

  const result = useMemo(() => buildWhatsAppLink(phone, message), [phone, message]);

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ToolCard title="Your details">
            <Field
              label="Phone number"
              htmlFor="wa-number"
              hint={
                result.error ? (
                  <span className="text-[#B4231E]">{result.error}</span>
                ) : (
                  "Pick the country, then type the number — spaces, dashes and a leading zero are stripped automatically."
                )
              }
            >
              <PhoneControl
                id="wa-number"
                value={phone}
                onChange={setPhone}
                placeholder="98765 43210"
                invalid={Boolean(result.error)}
              />
            </Field>

            <Field label="Pre-filled message" optional htmlFor="wa-message" className="mt-4.5">
              <TextAreaControl
                id="wa-message"
                rows={4}
                maxLength={WHATSAPP_PREFILL_MAX_LENGTH}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            <div className="mt-1.5 flex justify-between gap-3 text-[11.5px] text-muted-foreground">
              <span>Short openers get answered more often.</span>
              <span>
                {message.length}/{RECOMMENDED_LENGTH}
              </span>
            </div>
          </ToolCard>

          <ResultPanel eyebrow="Your link">
            <div className="mt-3.5 rounded-[10px] border border-white/[0.12] bg-white/[0.06] p-4 font-mono text-[13.5px] leading-[1.5] break-all text-[#EAF4FF]">
              {result.url || "https://wa.me/…"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <CopyButton value={result.url} label="Copy link" />
              <WhatsAppLinkButton href={result.url} disabled={!result.isValid}>
                Test in WhatsApp
              </WhatsAppLinkButton>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 text-[12.5px] font-bold text-white/90">
                What the customer sees
              </div>
              <div className="rounded-[14px] bg-[#ECE5DD] p-3.5">
                <div className="ml-auto max-w-[88%] rounded-[12px_12px_2px_12px] bg-[#D9FDD3] px-3 py-2.5 text-[13px] text-[#111] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                  {message || "(no pre-filled message)"}
                  <div className="text-right text-[10px] text-[#667781]">Draft · not sent</div>
                </div>
              </div>
            </div>

            {result.isValid ? (
              <p className="mt-5 text-[12px] text-white/60">
                wa.me receives your number as{" "}
                <span className="font-mono text-white/80">{result.digits}</span> — the +, spaces and
                dashes are stripped for you.
              </p>
            ) : null}

            <p className="mt-2.5 text-[12px] text-white/60">
              Branded short links, click tracking and per-campaign links are the RateUp upgrade.
            </p>
          </ResultPanel>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="A wa.me link starts the conversation on one person's phone — no assignment, no history, no automation. RateUp puts every reply into a shared inbox your whole team can work from."
        />
      ) : null}
    </>
  );
}
