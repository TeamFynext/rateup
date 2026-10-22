import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LEGAL_DOCS, LEGAL_EMAIL, LEGAL_ENTITY } from "./company";

export interface LegalSection {
  /** The anchor. Ids other sites link to (`#cancellation-and-refund`) must not change. */
  id: string;
  title: string;
  body: ReactNode;
}

export function P({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="text-[16px]/[1.7] text-ru-n-600">{children}</p>;
}

export function H3({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <h3 className="pt-2 font-display text-[17px]/[1.35] font-bold text-ru-n-700">{children}</h3>
  );
}

export function UL({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-[16px]/[1.65] text-ru-n-600 marker:text-ru-n-300">
      {children}
    </ul>
  );
}

const LINK = "font-medium text-ru-blue-600 underline underline-offset-3 hover:text-ru-blue-700";

export function DocLink({
  to,
  hash,
  children,
}: Readonly<{ to: LinkProps["to"]; hash?: string; children: ReactNode }>) {
  return (
    <Link to={to} hash={hash} className={LINK}>
      {children}
    </Link>
  );
}

export function Mail({ address = LEGAL_EMAIL }: Readonly<{ address?: string }>) {
  return (
    <a href={`mailto:${address}`} className={LINK}>
      {address}
    </a>
  );
}

/** A two-or-three column table that stacks into labelled cards below `sm`. */
export function LegalTable({
  head,
  rows,
}: Readonly<{ head: readonly string[]; rows: readonly (readonly ReactNode[])[] }>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ru-n-200">
      <table className="w-full border-collapse text-left text-[15px]/[1.5]">
        <thead className="max-sm:hidden">
          <tr className="bg-ru-n-25">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-display text-[13px] font-bold tracking-[0.06em] text-ru-n-500 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-ru-n-200 first:max-sm:border-t-0 max-sm:block max-sm:px-4 max-sm:py-3"
            >
              {row.map((cell, j) => (
                <td
                  key={head[j]}
                  className="px-4 py-3 align-top text-ru-n-600 first:font-semibold first:text-ru-n-700 max-sm:block max-sm:p-0 max-sm:not-first:mt-1"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalPage({
  title,
  updated,
  summary,
  sections,
}: Readonly<{
  title: string;
  /** Shown as written, e.g. "21 October 2026". */
  updated: string;
  summary: ReactNode;
  sections: readonly LegalSection[];
}>) {
  return (
    <div className="bg-white">
      <header className="border-b border-ru-n-100 bg-ru-n-25 px-5 pt-12 pb-10 sm:pt-18 sm:pb-14">
        <div className="mx-auto max-w-280">
          <p className="mb-4 font-display text-[13px] font-bold tracking-[0.14em] text-ru-blue-600 uppercase">
            Legal
          </p>
          <h1 className="font-display text-[clamp(2.125rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-ru-n-700">
            {title}
          </h1>
          <p className="mt-3 text-[14.5px] text-ru-n-500">Last updated {updated}</p>
          <div className="mt-6 max-w-190 rounded-2xl border border-ru-blue-200 bg-ru-blue-50 px-5 py-4 text-[16px]/[1.65] text-ru-n-600">
            {summary}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-280 gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[15rem_1fr] lg:gap-16">
        <nav
          aria-label="On this page"
          className="lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:[scrollbar-width:thin]"
        >
          <p className="mb-3 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
            On this page
          </p>
          <ol className="list-none space-y-0.5 border-l border-ru-n-200 p-0 max-lg:columns-1 sm:max-lg:columns-2">
            {sections.map((s, i) => (
              <li key={s.id} className="break-inside-avoid">
                <a
                  href={`#${s.id}`}
                  className="-ml-px block border-l border-transparent py-1 pl-3.5 text-[14px]/[1.4] text-ru-n-500 hover:border-ru-blue-600 hover:text-ru-blue-600"
                >
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-190">
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-28 border-t border-ru-n-100 py-8 first:border-t-0 first:pt-0"
            >
              <h2 className="mb-4 font-display text-[clamp(1.375rem,2.4vw,1.625rem)]/[1.2] font-bold tracking-[-0.02em] text-ru-n-700">
                <a href={`#${s.id}`} className="hover:text-ru-blue-600">
                  <span className="mr-2 text-ru-n-300">{i + 1}.</span>
                  {s.title}
                </a>
              </h2>
              <div className="space-y-4">{s.body}</div>
            </section>
          ))}

          <aside className="mt-6 rounded-2xl border border-ru-n-200 bg-ru-n-25 p-6">
            <p className="font-display text-[17px] font-bold text-ru-n-700">{LEGAL_ENTITY}</p>
            <p className="mt-1 text-[15px] text-ru-n-500">
              Operator of RateUp · <Mail />
            </p>
            <p className="mt-5 mb-2 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
              Other policies
            </p>
            <ul className="flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
              {LEGAL_DOCS.map((doc) => (
                <li key={doc.label}>
                  <Link
                    to={doc.to}
                    className="text-[15px] font-medium text-ru-blue-600 hover:underline [&.active]:text-ru-n-400 [&.active]:no-underline"
                  >
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
