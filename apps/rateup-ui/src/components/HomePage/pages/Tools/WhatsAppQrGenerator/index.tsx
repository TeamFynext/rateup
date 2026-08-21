import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";
import { buildWhatsAppLink, WHATSAPP_PREFILL_MAX_LENGTH } from "@/utils/whatsappLink.ts";

import {
  CopyButton,
  FaqSection,
  Field,
  HowItWorks,
  PhoneControl,
  PrimaryButton,
  RelatedTools,
  SelectControl,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
  WarnNote,
} from "../shared/ToolSections.tsx";

const SLUG = "whatsapp-qr-code-generator";

/** Print resolution for the PNG download — large enough for packaging artwork. */
const PNG_WIDTH = 1024;

const FOREGROUNDS = [
  { value: "#081C3F", label: "Navy #081C3F" },
  { value: "#1C518E", label: "Brand blue #1C518E" },
  { value: "#0A0B0A", label: "Black #0A0B0A" },
  { value: "#128C4A", label: "WhatsApp green" },
];

const LEVELS = [
  { value: "H", label: "H — survives a logo (30%)" },
  { value: "Q", label: "Q — 25%" },
  { value: "M", label: "M — 15%" },
] as const;

type Level = (typeof LEVELS)[number]["value"];

export default function WhatsAppQrGenerator() {
  const tool = getToolBySlug(SLUG);
  // PhoneControl hands back a complete E.164 number, so there is no separate
  // dial code to track.
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Hi! I'd like to know more.");
  const [foreground, setForeground] = useState(FOREGROUNDS[0].value);
  const [level, setLevel] = useState<Level>("H");

  // An empty field is not an error — the QR stays in its empty state and the
  // validation message hidden until the visitor has actually typed.
  const link = useMemo(() => buildWhatsAppLink(phone, message), [phone, message]);

  const [svg, setSvg] = useState("");
  const [pngUrl, setPngUrl] = useState("");

  // QR rendering is async and browser-only, so it runs in an effect rather than
  // during render. `cancelled` guards against a stale render landing after a
  // faster, newer one when the user types quickly.
  useEffect(() => {
    if (!link.isValid) {
      setSvg("");
      setPngUrl("");
      return;
    }

    let cancelled = false;
    const options = {
      errorCorrectionLevel: level,
      margin: 2,
      color: { dark: foreground, light: "#ffffff" },
    };

    const render = async () => {
      const [svgMarkup, dataUrl] = await Promise.all([
        QRCode.toString(link.url, { ...options, type: "svg" }),
        QRCode.toDataURL(link.url, { ...options, width: PNG_WIDTH }),
      ]);
      if (cancelled) return;
      setSvg(svgMarkup);
      setPngUrl(dataUrl);
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [link.isValid, link.url, foreground, level]);

  const download = (href: string, filename: string) => {
    const anchor = globalThis.document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
  };

  const downloadSvg = () => {
    const blob = new globalThis.Blob([svg], { type: "image/svg+xml" });
    const url = globalThis.URL.createObjectURL(blob);
    download(url, "whatsapp-qr-code.svg");
    globalThis.URL.revokeObjectURL(url);
  };

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ToolCard title="Your QR">
            <Field label="Phone number" htmlFor="qr-number" hint={errorHint(link.error)}>
              <PhoneControl
                id="qr-number"
                value={phone}
                onChange={setPhone}
                placeholder="98765 43210"
                invalid={Boolean(link.error)}
              />
            </Field>

            <Field label="Pre-filled message" htmlFor="qr-message" className="mt-4.5">
              <TextControl
                id="qr-message"
                maxLength={WHATSAPP_PREFILL_MAX_LENGTH}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>

            <div className="mt-4.5 grid gap-3.5 sm:grid-cols-2">
              <Field label="Foreground" htmlFor="qr-fg">
                <SelectControl
                  id="qr-fg"
                  value={foreground}
                  onChange={(event) => setForeground(event.target.value)}
                >
                  {FOREGROUNDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Error correction" htmlFor="qr-level">
                <SelectControl
                  id="qr-level"
                  value={level}
                  onChange={(event) => setLevel(toLevel(event.target.value))}
                >
                  {LEVELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </div>

            <WarnNote>
              Print at <b>2 cm or larger</b> for table tents, <b>4 cm</b> for storefront glass. Keep
              the white quiet zone — cropping it breaks scanning.
            </WarnNote>
          </ToolCard>

          <div className="rounded-2xl border border-[#ECECEA] bg-white p-6 text-center shadow-[0_1px_2px_rgba(11,31,72,.06),0_8px_24px_rgba(11,31,72,.06)] sm:p-7">
            <div className="inline-flex flex-col items-center rounded-[14px] border border-[#ECECEA] bg-white p-[22px]">
              <div className="size-[240px] max-w-full [&>svg]:size-full">
                {svg ? (
                  // Markup produced by the qrcode library from values this component
                  // controls — there is no user-authored HTML in it.
                  <div className="size-full" dangerouslySetInnerHTML={{ __html: svg }} />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-lg bg-[#FAFAF7] px-6 text-[12.5px] text-[#8A8C88]">
                    Enter a valid number to generate the QR code
                  </div>
                )}
              </div>
              <div className="mt-3.5 flex items-center gap-2 font-nunito text-[14px] font-extrabold text-[#081C3F]">
                <span className="inline-block size-5 rounded-[5px] bg-[#25D366]" />
                <span>Scan to chat on WhatsApp</span>
              </div>
            </div>

            <div className="mt-4 font-mono text-[12px] break-all text-[#8A8C88]">
              {link.url || "https://wa.me/…"}
            </div>

            <div className="mt-4.5 flex flex-wrap justify-center gap-2.5">
              <PrimaryButton
                disabled={!pngUrl}
                onClick={() => download(pngUrl, "whatsapp-qr-code.png")}
              >
                Download PNG
              </PrimaryButton>
              <OutlineSvgButton disabled={!svg} onClick={downloadSvg} />
              <CopyButton value={link.url} label="Copy link" variant="outline" />
            </div>

            <p className="mt-4 text-[12px] text-[#8A8C88]">
              Logo in the centre, branded frames and scan analytics — available on RateUp.
            </p>
          </div>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="The code you just downloaded is static — the number and the message are baked in, so a change means a reprint and you never learn how many people scanned it. RateUp QR Studio gives you codes you can re-point any time, with scan tracking behind them."
        />
      ) : null}
    </>
  );
}

function OutlineSvgButton({
  disabled,
  onClick,
}: Readonly<{ disabled: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#CBD9EA] bg-white px-4.5 py-3 text-[14px] font-bold text-[#1C518E] transition-colors hover:bg-[#F3F7FC] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Download SVG
    </button>
  );
}

const errorHint = (error: string | null) =>
  error ? <span className="text-[#B4231E]">{error}</span> : undefined;

const toLevel = (value: string): Level =>
  value === "Q" || value === "M" || value === "H" ? value : "H";
