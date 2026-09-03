import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { getRelatedTools, toolPath, type ToolFaq, type ToolStep } from "@/config/tools.ts";
import { cn } from "@/lib/utils.ts";
import { copyToClipboard } from "@/utils/whatsappLink.ts";

/* ────────────────────────────────────────────────────────────────────────────
 * Design primitives
 *
 * The tools pages run on their own palette rather than the app's shadcn tokens:
 * a warm #FAFAF7 canvas, white cards, and a navy result panel. Colours are kept
 * as literal Tailwind arbitrary values so the mapping back to the design file
 * stays greppable.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Standard page-width wrapper. */
export function ToolContainer({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-6 lg:px-8", className)}>{children}</div>
  );
}

/** White card — the left-hand input side of every tool. */
export function ToolCard({
  title,
  subtitle,
  children,
  className,
}: Readonly<{
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-white p-6 shadow-[0_1px_2px_rgba(11,31,72,.06),0_8px_24px_rgba(11,31,72,.06)] sm:p-7",
        className,
      )}
    >
      {title ? (
        <div className="font-nunito text-[19px] font-extrabold text-foreground">{title}</div>
      ) : null}
      {subtitle ? <p className="mt-1.5 text-[12.5px] text-muted-foreground">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-5" : undefined}>{children}</div>
    </div>
  );
}

/** Navy gradient panel — the right-hand result side. */
export function ResultPanel({
  eyebrow,
  children,
  className,
}: Readonly<{
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[radial-gradient(ellipse_at_20%_0%,#0D2E5C,var(--color-ru-blue-900)_70%)] p-6 text-white sm:p-7",
        className,
      )}
    >
      {eyebrow ? (
        <div className="text-[10.5px] font-extrabold tracking-[0.14em] text-ru-blue-300 uppercase">
          {eyebrow}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** The big Nunito figure inside a result panel. */
export function ResultFigure({
  value,
  suffix,
  note,
}: Readonly<{ value: string; suffix?: string; note?: string }>) {
  return (
    <>
      <div className="mt-2.5 flex flex-wrap items-end gap-3.5">
        <span className="font-nunito text-[40px] leading-none font-black tracking-[-0.02em] text-white sm:text-[56px]">
          {value}
        </span>
        {suffix ? (
          <span className="pb-1.5 text-[16px] font-semibold text-white/70">{suffix}</span>
        ) : null}
      </div>
      {note ? <p className="mt-1.5 text-[14px] text-white/[0.68]">{note}</p> : null}
    </>
  );
}

/** Line-item rows inside a result panel. */
export function ResultRows({
  rows,
}: Readonly<{ rows: { label: string; detail: string; cost: string }[] }>) {
  return (
    <div className="mt-5 border-t border-white/10">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-3"
        >
          <div>
            <div className="text-[14px] font-bold text-white">{row.label}</div>
            <div className="text-[11.5px] text-white/55">{row.detail}</div>
          </div>
          <div className="shrink-0 text-[15px] font-bold text-[#EAF4FF]">{row.cost}</div>
        </div>
      ))}
    </div>
  );
}

/** Soft blue note block used under the inputs. */
export function InfoNote({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mt-5 rounded-[10px] bg-[#F3F7FC] px-4 py-3.5 text-[12.5px] leading-[1.5] text-[#3A4A61]">
      {children}
    </div>
  );
}

/** Amber note block for caveats — print sizes, branding, gotchas. */
export function WarnNote({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mt-5 rounded-[10px] bg-[#FFF6E6] px-4 py-3.5 text-[12.5px] leading-[1.5] text-[#7A4C05]">
      {children}
    </div>
  );
}

/* ── Form controls ─────────────────────────────────────────────────────────── */

const CONTROL =
  "w-full rounded border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors focus:border-primary";

export function Field({
  label,
  optional,
  hint,
  htmlFor,
  children,
  className,
}: Readonly<{
  label: string;
  optional?: boolean;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-[7px] block text-[12.5px] font-bold text-muted-foreground [&>span]:font-medium [&>span]:text-muted-foreground"
      >
        {label}
        {optional ? <span> (optional)</span> : null}
      </label>
      {children}
      {hint ? <div className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function TextControl(props: Readonly<React.ComponentProps<"input">>) {
  return <input {...props} className={cn(CONTROL, props.className)} />;
}

export function SelectControl(props: Readonly<React.ComponentProps<"select">>) {
  return <select {...props} className={cn(CONTROL, props.className)} />;
}

/**
 * Country picker + national number in one field, on the same
 * `react-phone-number-input` component the signup and dashboard forms use — so
 * the flag list, formatting and E.164 output stay identical across the product.
 *
 * The shadcn styling underneath belongs to the app's token palette, so it is
 * overridden here to sit on the tools' own #E5E7EB / var(--primary) control styling.
 */
export function PhoneControl({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: Readonly<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
}>) {
  // Written out in full rather than interpolated — Tailwind only sees class
  // names that appear literally in the source.
  const border = invalid
    ? "[&>button]:border-[#B4231E] [&_input]:border-[#B4231E]"
    : "[&>button]:border-[#E5E7EB] [&_input]:border-[#E5E7EB]";
  return (
    <PhoneInput
      id={id}
      international
      defaultCountry="IN"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      placeholder={placeholder}
      className={cn(
        "[&>button]:h-[42px] [&>button]:rounded-l [&>button]:rounded-r-none [&>button]:bg-white [&>button]:px-3 [&>button]:shadow-none [&>button]:hover:bg-[#F6F7F5]",
        "[&_input]:h-[42px] [&_input]:rounded-r [&_input]:rounded-l-none [&_input]:bg-white [&_input]:px-3 [&_input]:text-[14px] [&_input]:text-foreground [&_input]:shadow-none [&_input]:focus-visible:ring-0",
        border,
        "[&_input]:focus-visible:border-primary",
      )}
    />
  );
}

export function TextAreaControl(props: Readonly<React.ComponentProps<"textarea">>) {
  return <textarea {...props} className={cn(CONTROL, "resize-y", props.className)} />;
}

/* ── Buttons ───────────────────────────────────────────────────────────────── */

const BTN_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none px-4.5 py-3 text-[14px] font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ className, ...props }: Readonly<React.ComponentProps<"button">>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(BTN_BASE, "bg-primary text-white hover:bg-[#164272]", className)}
    />
  );
}

export function LightButton({ className, ...props }: Readonly<React.ComponentProps<"button">>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(BTN_BASE, "bg-white text-ru-blue-900 hover:bg-white/90", className)}
    />
  );
}

export function OutlineButton({ className, ...props }: Readonly<React.ComponentProps<"button">>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        BTN_BASE,
        "border border-[#CBD9EA] bg-white font-bold text-primary hover:bg-[#F3F7FC]",
        className,
      )}
    />
  );
}

export function WhatsAppLinkButton({
  href,
  disabled,
  children,
}: Readonly<{ href: string; disabled?: boolean; children: React.ReactNode }>) {
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={cn(
        BTN_BASE,
        "bg-[#25D366] text-[#062D17] hover:bg-[#1fbe5b]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </a>
  );
}

/** Copy-to-clipboard control with a transient confirmation label. */
export function CopyButton({
  value,
  label = "Copy",
  variant = "light",
  disabled,
  className,
}: Readonly<{
  value: string;
  label?: string;
  variant?: "light" | "outline";
  disabled?: boolean;
  className?: string;
}>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1800);
  };

  const Button = variant === "outline" ? OutlineButton : LightButton;

  return (
    <Button onClick={handleCopy} disabled={disabled || !value} className={className}>
      {copied ? "Copied" : label}
    </Button>
  );
}

/* ── Below-the-fold sections ───────────────────────────────────────────────── */

/** "How it works" — three cards with the warm gradient ordinal. */
export function HowItWorks({ steps }: Readonly<{ steps: ToolStep[] }>) {
  return (
    <ToolContainer className="pt-16">
      <h2 className="m-0 font-nunito text-[26px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[32px]">
        How it works
      </h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.n} className="rounded-xl border border-border bg-white p-6">
            <div className="bg-ru-star bg-clip-text font-nunito text-[32px] leading-none font-black text-transparent">
              {step.n}
            </div>
            <div className="mt-2.5 mb-1.5 font-nunito text-[16px] font-extrabold text-foreground">
              {step.title}
            </div>
            <p className="m-0 text-[13.5px] leading-[1.55] text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </ToolContainer>
  );
}

/**
 * FAQ — deliberately flat rather than an accordion, so the answers are in the
 * rendered HTML for search engines as well as for readers. The same array is
 * serialised into FAQPage JSON-LD by the route.
 */
export function FaqSection({ faqs }: Readonly<{ faqs: ToolFaq[] }>) {
  return (
    <ToolContainer className="pt-14">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="m-0 font-nunito text-[26px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[32px]">
            Questions
          </h2>
          <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">
            Everything below is on the page for search engines as well as for you — no accordions
            hiding the answers.
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border bg-white px-6 py-5">
              <div className="font-nunito text-[16px] font-extrabold text-foreground">
                {faq.question}
              </div>
              <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </ToolContainer>
  );
}

/** Cross-links to sibling tools. */
export function RelatedTools({ slug }: Readonly<{ slug: string }>) {
  const related = getRelatedTools(slug);
  if (related.length === 0) return null;

  return (
    <ToolContainer className="pt-14">
      <h2 className="m-0 font-nunito text-[24px] font-extrabold tracking-[-0.02em] text-foreground">
        Related tools
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {related.map((tool) => (
          <Link
            key={tool.slug}
            to={toolPath(tool.slug)}
            className="block rounded-xl border border-border bg-white p-[22px] transition-colors hover:border-[#CBD9EA]"
          >
            <div className="font-nunito text-[16px] font-extrabold text-foreground">
              {tool.name}
            </div>
            <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
              {tool.description}
            </p>
            <div className="mt-3.5 text-[12.5px] font-bold text-primary">Open tool →</div>
          </Link>
        ))}
      </div>
    </ToolContainer>
  );
}

/** Closing conversion band. */
export function ToolCta({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <ToolContainer className="py-16 lg:py-[72px]">
      <div className="grid items-center gap-10 rounded-3xl bg-[radial-gradient(ellipse_at_25%_0%,#0D2E5C,var(--color-ru-blue-900)_70%)] p-8 text-white sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:p-14">
        <div>
          <div className="text-[11px] font-extrabold tracking-[0.14em] text-ru-blue-300 uppercase">
            Ready to automate it?
          </div>
          <h2 className="mt-3.5 font-nunito text-[28px] leading-[1.1] font-black tracking-[-0.025em] text-white sm:text-[40px]">
            {title}
          </h2>
          <p className="mt-3.5 max-w-[520px] text-[15px] leading-[1.6] text-white/75 sm:text-[16px]">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to="/signup"
            className="cursor-pointer rounded-[10px] bg-ru-star px-6 py-4 text-center text-[15px] font-extrabold text-ru-blue-900 transition-transform hover:-translate-y-0.5"
          >
            Start free trial
          </Link>
          <Link
            to="/contact-us"
            className="cursor-pointer rounded-[10px] border border-white/[0.22] px-6 py-4 text-center text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </ToolContainer>
  );
}
