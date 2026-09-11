import { IconDownload, IconRefresh } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { getToolBySlug } from "@/config/tools.ts";

import {
  CopyButton,
  FaqSection,
  Field,
  HowItWorks,
  InfoNote,
  LightButton,
  RelatedTools,
  ResultFigure,
  ResultPanel,
  SelectControl,
  TextControl,
  ToolCard,
  ToolContainer,
  ToolCta,
} from "../shared/ToolSections.tsx";

const SLUG = "shopify-bulk-discount-code-generator";

const CHARSETS = {
  alphanumeric: { label: "Alphanumeric (A-Z, 0-9)", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" },
  letters: { label: "Letters only (A-Z)", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  digits: { label: "Digits only (0-9)", chars: "0123456789" },
};

export default function ShopifyBulkDiscountGenerator() {
  const tool = getToolBySlug(SLUG);

  const [prefix, setPrefix] = useState("SUMMER");
  const [suffix, setSuffix] = useState("");
  const [length, setLength] = useState(8);
  const [charsetType, setCharsetType] = useState<keyof typeof CHARSETS>("alphanumeric");
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [batchSize, setBatchSize] = useState(100);
  const [seed, setSeed] = useState(0);

  const count = (value: number) => Math.round(value).toLocaleString("en-IN");

  const codes = useMemo(() => {
    // dummy use of seed to trigger regeneration
    seed; // dummy use of seed to trigger regeneration
    let chars = CHARSETS[charsetType].chars;
    if (excludeAmbiguous) {
      chars = chars.replace(/[0O1IL]/g, "");
    }
    if (chars.length === 0) return []; // Fallback

    const charLen = chars.length;
    const result = new Set<string>();
    const maxAttempts = batchSize * 10;
    let attempts = 0;

    // Limit batchSize to max 5000
    const limit = Math.min(Math.max(1, batchSize), 5000);
    const randLen = Math.max(1, length);

    const array = new Uint32Array(randLen);

    while (result.size < limit && attempts < maxAttempts) {
      crypto.getRandomValues(array);
      let randomPart = "";
      for (let i = 0; i < randLen; i++) {
        randomPart += chars[array[i] % charLen];
      }
      result.add(`${prefix}${randomPart}${suffix}`.toUpperCase());
      attempts++;
    }

    return Array.from(result);
  }, [prefix, suffix, length, charsetType, excludeAmbiguous, batchSize, seed]);

  const handleDownloadCsv = () => {
    const csvContent = ["Discount code", ...codes].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `discount_codes_${batchSize}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ToolContainer className="pt-7">
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.15fr]">
          <ToolCard title="Configuration" subtitle="Configure your batch of random discount codes.">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Prefix" htmlFor="cfg-prefix" optional>
                <TextControl
                  id="cfg-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER"
                />
              </Field>
              <Field label="Suffix" htmlFor="cfg-suffix" optional>
                <TextControl
                  id="cfg-suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                  placeholder="e.g. 2024"
                />
              </Field>
            </div>

            <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
              <Field label="Random length" htmlFor="cfg-len">
                <TextControl
                  id="cfg-len"
                  type="number"
                  min={1}
                  max={32}
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label="Batch size" htmlFor="cfg-batch">
                <TextControl
                  id="cfg-batch"
                  type="number"
                  min={1}
                  max={5000}
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                />
              </Field>
            </div>

            <div className="mt-3.5">
              <Field label="Character set" htmlFor="cfg-charset">
                <SelectControl
                  id="cfg-charset"
                  value={charsetType}
                  onChange={(e) => setCharsetType(e.target.value as keyof typeof CHARSETS)}
                >
                  {Object.entries(CHARSETS).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </div>

            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-2 text-[13.5px] text-foreground">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                Exclude ambiguous characters (0/O, 1/I/L)
              </label>
            </div>

            <InfoNote>
              Your current settings will generate codes like:{" "}
              <b>
                {prefix}
                {Array(length).fill("X").join("")}
                {suffix}
              </b>
              .
            </InfoNote>
          </ToolCard>

          <div className="flex flex-col gap-3.5">
            <ResultPanel eyebrow="Generated Codes">
              <ResultFigure value={count(codes.length)} note="unique codes generated" />

              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-2.5 text-[12.5px] font-bold text-white/70">
                  Preview (first 5)
                </div>
                <div className="flex flex-col gap-1.5 rounded-lg bg-card text-card-foreground/5 p-4 font-mono text-[14px] text-white">
                  {codes.slice(0, 5).map((c) => (
                    <div key={c} className="truncate">
                      {c}
                    </div>
                  ))}
                  {codes.length > 5 && (
                    <div className="mt-1 text-[12.5px] text-white/40">
                      ...and {count(codes.length - 5)} more
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <LightButton onClick={handleDownloadCsv} className="flex-1 whitespace-nowrap">
                  <IconDownload size={18} /> Download CSV
                </LightButton>
                <CopyButton
                  value={codes.join("\r\n")}
                  label="Copy All"
                  className="flex-1 whitespace-nowrap"
                />
                <LightButton
                  onClick={() => setSeed((s) => s + 1)}
                  className="flex-none px-4"
                  title="Regenerate"
                >
                  <IconRefresh size={18} />
                </LightButton>
              </div>
            </ResultPanel>
          </div>
        </div>
      </ToolContainer>

      {tool ? <HowItWorks steps={tool.steps} /> : null}
      {tool ? <FaqSection faqs={tool.faqs} /> : null}
      <RelatedTools slug={SLUG} />
      {tool ? (
        <ToolCta
          title={tool.cta}
          description="RateUp helps Shopify brands recover lost revenue with automated COD confirmation flows and returns management."
        />
      ) : null}
    </>
  );
}
