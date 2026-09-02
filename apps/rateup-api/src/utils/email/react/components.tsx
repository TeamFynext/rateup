import {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";
import type { ReactNode } from "react";
import { brand, emailImage, logoUrl, socialLinks } from "./brand.js";
import { rateupTailwindConfig } from "./theme.js";

/**
 * Design System V2's two faces, in the weights the type scale actually asks for:
 * Instrument Sans 400 and 500 for running text, Figtree 400 for the display
 * steps. Google serves these as static TTFs — the variable `.woff2` the app
 * loads is not safe in mail clients, several of which render only the default
 * instance. Clients that strip web fonts fall back to Arial, which both
 * families already list.
 */
function BrandFonts() {
  return (
    <>
      <Font
        fontFamily="Instrument Sans"
        fallbackFontFamily={["Arial", "sans-serif"]}
        webFont={{
          url: "https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npSTF-Qf1.ttf",
          format: "truetype",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Instrument Sans"
        fallbackFontFamily={["Arial", "sans-serif"]}
        webFont={{
          url: "https://fonts.gstatic.com/s/instrumentsans/v4/pximypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr-yp2JGEJOH9npST3-Qf1.ttf",
          format: "truetype",
        }}
        fontWeight={500}
        fontStyle="normal"
      />
      <Font
        fontFamily="Figtree"
        fallbackFontFamily={["Arial", "sans-serif"]}
        webFont={{
          url: "https://fonts.gstatic.com/s/figtree/v9/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5e.ttf",
          format: "truetype",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </>
  );
}

function Footer({ note, unsubscribeUrl }: { note?: ReactNode; unsubscribeUrl?: string }) {
  return (
    <Section className="border-stroke mobile:px-6! border-t px-10 py-16">
      {note ? <Section className="mb-8">{note}</Section> : null}

      <Text className="font-13 font-body text-fg-3 m-0 max-w-[320px]">{brand.tagline}</Text>

      <Row align="left">
        <Column className="w-full align-top">
          <Section align="left" className="mt-8 w-[152px]">
            <Row align="left">
              {socialLinks.map((social, index) => (
                <Column
                  key={social.label}
                  className={index === socialLinks.length - 1 ? "w-[20px]" : "w-[20px] pr-8"}
                >
                  <Link href={social.href} className="inline-block">
                    <Img
                      src={emailImage(social.icon)}
                      alt={social.label}
                      width={20}
                      height={20}
                      className="block border-none"
                    />
                  </Link>
                </Column>
              ))}
            </Row>
          </Section>
        </Column>
      </Row>

      <Row align="left">
        <Column className="w-full pt-8 align-top">
          <Text className="font-11 font-body text-fg-2 m-0">
            {brand.address.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            &copy; {new Date().getFullYear()} {brand.name}. All rights reserved.
          </Text>
        </Column>
      </Row>

      {/*
        Collage closes on an unsubscribe line. That only belongs on mail a person
        can opt out of, so transactional and internal messages get the support
        address in the same slot instead — there is nothing to unsubscribe from
        on a password reset.
      */}
      <Row align="left">
        <Column className="w-full pt-5 align-top">
          {unsubscribeUrl ? (
            <Text className="font-11 font-body text-fg-2 m-0 max-w-[220px]">
              <Link href={unsubscribeUrl} className="text-fg-2">
                Unsubscribe
              </Link>{" "}
              from {brand.name} marketing emails.
            </Text>
          ) : (
            <Text className="font-11 font-body text-fg-2 m-0">
              Questions? Reach us at{" "}
              <Link href={`mailto:${brand.supportEmail}`} className="text-fg-2">
                {brand.supportEmail}
              </Link>
              .
            </Text>
          )}
        </Column>
      </Row>
    </Section>
  );
}

interface EmailLayoutProps {
  /** The inbox preview line. Keep it under ~90 characters. */
  preview: string;
  children: ReactNode;
  /**
   * Collage's tinted full-width band, below the main block. Onboarding and
   * digest mail only — wrap the contents in `<Band>`. Transactional messages
   * leave it out; a checklist under a six-digit code is noise.
   */
  band?: ReactNode;
  /**
   * Small print that sits below the call to action in its own block — expiry
   * notes, "ignore this if it wasn't you". Wrap it in `<Muted>`.
   */
  note?: ReactNode;
  /** Extra copy above the footer blurb — automated-mail disclaimers. */
  footerNote?: ReactNode;
  /**
   * Turns the footer's closing line into Collage's unsubscribe sentence. Pass
   * it on marketing and digest mail only.
   */
  unsubscribeUrl?: string;
}

/**
 * Collage's shell: a white card on a tinted canvas, then — in order — the brand
 * mark, one generously padded content block, an optional tinted band, small
 * print, and the footer.
 *
 * A one-for-one port of React Email's "Collage" demo with two deliberate
 * departures, both because RateUp has no artwork for them: Collage opens and
 * closes the card with full-bleed illustrations, where this puts the wordmark at
 * the top and nothing at the bottom. Everything else — the `pt-20 pb-14` content
 * block, the `bg-2` band, the type scale, the footer — matches.
 *
 * The card is two nested `Section`s exactly as Collage has it: the outer one
 * carries the shadow and radius, the inner one the background, border and
 * `overflow-hidden`. Note that Gmail, Outlook and Yahoo strip box-shadow and
 * Outlook ignores border-radius, so those clients render a flat,
 * square-cornered card — same layout and colours, just without the lift.
 */
export function EmailLayout({
  preview,
  children,
  band,
  note,
  footerNote,
  unsubscribeUrl,
}: EmailLayoutProps) {
  return (
    <Tailwind config={rateupTailwindConfig}>
      <Html lang="en">
        <Head>
          <BrandFonts />
        </Head>
        <Body className="bg-canvas font-14 font-body text-fg m-0 p-0">
          <Preview>{preview}</Preview>
          <Container className="mx-auto max-w-[640px] px-4 pt-16 pb-6">
            <Section className="shadow-card rounded-[8px]">
              <Section className="bg-bg border-stroke overflow-hidden rounded-[8px] border">
                {/*
                  Occupies the slot Collage gives its inset illustration. The V2
                  lockup is the colour-on-transparency artwork, so it sits
                  directly on the white card. Width and height must stay in the
                  source's 2.52:1 ratio; Outlook honours the attributes rather
                  than scaling. The V2 artwork carries more internal padding than
                  the lockup it replaced, so the box is larger than the old
                  182x55 to leave the wordmark itself the same optical size.
                */}
                <Section className="mobile:px-6! px-10 pt-16">
                  <Img
                    src={logoUrl()}
                    alt={brand.name}
                    width={202}
                    height={80}
                    className="block border-none"
                  />
                </Section>

                <Section
                  className={`mobile:px-6! mobile:pt-10 px-10 pt-20 text-left ${note ? "pb-8" : "pb-14"}`}
                >
                  {children}
                </Section>

                {note ? <Section className="mobile:px-6! px-10 pb-14">{note}</Section> : null}

                {band ? (
                  <Section className="bg-bg-2 mobile:px-0! mobile:py-16! px-4 py-20">
                    {band}
                  </Section>
                ) : null}

                <Footer note={footerNote} unsubscribeUrl={unsubscribeUrl} />
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

/** The lead heading of an email. One per message. */
export function Display({ children }: { children: ReactNode }) {
  return <Text className="font-48 text-fg m-0 font-sans">{children}</Text>;
}

/** A section heading below the display heading. */
export function Title({ children }: { children: ReactNode }) {
  return <Text className="font-20 font-body text-fg m-0 leading-normal">{children}</Text>;
}

/**
 * A body paragraph. The first in a block carries Collage's `mt-[18px]`; pass
 * `tight` for the runs that follow it, which sit flush like Collage's do.
 */
export function Paragraph({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return (
    <Text className={`font-14 font-body text-fg-2 m-0${tight ? "" : " mt-[18px]"}`}>
      {children}
    </Text>
  );
}

/** Small print — expiry notes, "ignore this if it wasn't you", disclaimers. */
export function Muted({ children }: { children: ReactNode }) {
  return <Text className="font-11 font-body text-fg-3 m-0 max-w-[310px]">{children}</Text>;
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      className="bg-brand font-15 font-body text-fg-inverted inline-block border-none px-5 py-3.5 text-center"
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      className="bg-bg border-stroke font-15 font-body text-fg inline-block border px-5 py-3.5 text-center"
    >
      {children}
    </Button>
  );
}

/** Two buttons on one line. */
export function ButtonPair({
  primary,
  secondary,
}: {
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}) {
  return (
    <Row align="left">
      <Column className="pr-3 align-middle">
        <PrimaryButton href={primary.href}>{primary.label}</PrimaryButton>
      </Column>
      <Column className="align-middle">
        <SecondaryButton href={secondary.href}>{secondary.label}</SecondaryButton>
      </Column>
    </Row>
  );
}

export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * Collage's billing breakdown — line items in tinted rows, closed by a darker
 * total. Separate `Section`s with a 3px gap rather than one bordered table:
 * every client renders a background colour on a `<td>`, while collapsed borders
 * and `border-spacing` are inconsistent in Outlook.
 */
export function SummaryRows({ rows, total }: { rows: SummaryRow[]; total?: SummaryRow }) {
  return (
    <Section>
      {rows.map((row) => (
        <Section key={row.label} className="bg-summary mb-[3px] p-3">
          <Row>
            <Column>
              <Text className="font-14 text-fg m-0 font-sans font-normal">{row.label}</Text>
            </Column>
            <Column align="right">
              <Text className="font-14 text-fg m-0 font-sans font-normal">{row.value}</Text>
            </Column>
          </Row>
        </Section>
      ))}
      {total ? (
        <Section className="bg-summary-total p-3">
          <Row>
            <Column>
              <Text className="font-14 text-fg m-0 font-sans font-normal">{total.label}</Text>
            </Column>
            <Column align="right">
              <Text className="font-14 text-fg m-0 font-sans font-normal">{total.value}</Text>
            </Column>
          </Row>
        </Section>
      ) : null}
    </Section>
  );
}

export interface HighlightItem {
  title: string;
  description: string;
  /** Turns the row into a link, with a trailing arrow in the right column. */
  href?: string;
}

/**
 * Collage's rule-separated list of title + description rows.
 *
 * Collage puts a chevron image in the narrow right column; this uses a text
 * arrow instead, so the pattern needs no new CDN asset and still shows up when a
 * client blocks images. When a row has an `href` its title links too — an arrow
 * glyph on its own is a small tap target and easy to miss.
 */
export function HighlightList({ items }: { items: HighlightItem[] }) {
  return (
    <Section>
      {items.map((item) => (
        <Section key={item.title} className="border-stroke border-b py-6">
          <Row>
            <Column className="w-[92%] align-top">
              <Text className="font-20 font-body text-fg m-0 leading-normal">
                {item.href ? (
                  <Link href={item.href} className="text-fg">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </Text>
              <Text className="font-14 font-body text-fg-2 m-0 mt-1 max-w-[380px]">
                {item.description}
              </Text>
            </Column>
            <Column className="w-[8%] text-right align-middle">
              {item.href ? (
                <Link href={item.href} className="font-15 font-body text-fg-3">
                  &rarr;
                </Link>
              ) : null}
            </Column>
          </Row>
        </Section>
      ))}
    </Section>
  );
}

export interface BandProps {
  /** The band's display heading — Collage keeps this to about six words. */
  heading: string;
  /** A sentence or two under the heading, setting up the list. */
  intro: string;
  /** The short line immediately above the rows. */
  lead: string;
  items: HighlightItem[];
}

/**
 * Collage's tinted second band: a display heading, a paragraph, a lead-in line,
 * then rule-separated rows. Pass it to `EmailLayout`'s `band` prop, which
 * supplies the background and vertical padding; the `px-6` here is Collage's
 * inner inset, on top of the band's own `px-4`.
 *
 * This is now the only multi-item list pattern in the system. A `NextSteps`
 * block used to do the same job at different metrics, so onboarding steps and
 * digest rows drifted apart; both go through here instead.
 */
export function Band({ heading, intro, lead, items }: BandProps) {
  return (
    <>
      <Section className="px-6">
        <Text className="font-48 text-fg m-0 max-w-[400px] font-sans">{heading}</Text>
        <Text className="font-14 font-body text-fg-2 m-0 mt-[18px] max-w-[479px]">{intro}</Text>
      </Section>
      <Section className="px-6 pt-14">
        <Text className="font-15 font-body text-fg m-0">{lead}</Text>
        <Section className="pt-9">
          <HighlightList items={items} />
        </Section>
      </Section>
    </>
  );
}

const calloutTones = {
  info: "bg-brand-soft border-brand",
  success: "bg-success-bg border-success-stroke",
  warning: "bg-warning-bg border-warning-stroke",
  danger: "bg-danger-bg border-danger-stroke",
} as const;

/** A tinted panel with a coloured left rule, for the one thing that matters most. */
export function Callout({
  tone = "info",
  children,
}: {
  tone?: keyof typeof calloutTones;
  children: ReactNode;
}) {
  return (
    <Section className={`${calloutTones[tone]} border-0 border-l-4 border-solid px-5 py-4`}>
      {children}
    </Section>
  );
}

/** The one-time password itself: large, spaced, and selectable as plain text. */
export function OtpCode({ code }: { code: string }) {
  return (
    <Section className="bg-bg-2 border-stroke border px-6 py-6 text-center">
      <Text className="font-32 text-fg m-0 font-sans tracking-[10px]">{code}</Text>
    </Section>
  );
}
