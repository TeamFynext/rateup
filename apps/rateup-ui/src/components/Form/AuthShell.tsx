import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AuthHeader } from "./AuthHeader.tsx";

const FOOTER_LINK =
  "text-[11.5px] font-medium tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground";

/**
 * The chrome every auth screen shares: the navy header with the account switch,
 * the tinted canvas the card floats on, and the legal footer.
 *
 * Sign in, the signup wizard, email verification and the password reset flow all
 * render inside this, so the header height, the wash and the footer stay in step
 * across the flow instead of drifting per screen.
 */
export function AuthShell({
  isSignup,
  onSwitch,
  headerMaxWidth = "max-w-5xl",
  children,
}: Readonly<{
  /** Which side of the switch the viewer is on — flips the header's prompt and link. */
  isSignup: boolean;
  /** Overrides the header's switch link with an in-flow handler (wizard steps). */
  onSwitch?: () => void;
  headerMaxWidth?: string;
  children: ReactNode;
}>) {
  const { t: translations } = useTranslation();

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary">
      <div className="sticky top-0 z-50 w-full">
        <AuthHeader isSignup={isSignup} onSwitch={onSwitch} maxWidth={headerMaxWidth} />
      </div>

      {/* The canvas lifts to the brand tint at the top of the fold so the card reads as
          sitting on light rather than on a flat panel. `--accent` is the soft blue in
          light and surface-3 in dark, which keeps the wash legible in both themes. */}
      <main className="flex flex-1 items-center justify-center bg-[radial-gradient(120%_90%_at_50%_-10%,var(--accent)_0%,var(--background)_58%)] px-5 py-3">
        {children}
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-5 border-t border-border bg-card px-5 py-2.5">
        <Link to="/privacy-policy" className={FOOTER_LINK}>
          {translations("Privacy")}
        </Link>
        <Link to="/terms-of-service" className={FOOTER_LINK}>
          {translations("Terms")}
        </Link>
        <a href="https://docs.rateup.app" target="_blank" rel="noreferrer" className={FOOTER_LINK}>
          {translations("Help centre")}
        </a>
        <span className="text-[11.5px] tracking-[0.08em] text-muted-foreground/60 uppercase">
          © {new Date().getFullYear()} RateUp
        </span>
      </footer>
    </div>
  );
}

/**
 * The auth card's heading block — the 29px display title and its one-line
 * subtitle, at the size every screen in the flow uses.
 */
export function AuthTitle({
  title,
  subtitle,
  align = "start",
  size = "default",
}: Readonly<{
  title: string;
  subtitle?: string;
  align?: "start" | "center";
  /**
   * "lg" is the design's full 29px display size. The signup wizard runs at
   * "default" because three steps of fields have to share the fold with it;
   * screens that hold one short form have the room for the larger type.
   */
  size?: "default" | "lg";
}>) {
  const large = size === "lg";
  return (
    <div
      className={`flex flex-col ${large ? "gap-1.5" : "gap-1"} ${
        align === "center" ? "items-center text-center" : ""
      }`}
    >
      <h1
        className={`font-display font-bold tracking-[-0.028em] text-foreground ${
          large ? "text-[29px] leading-[1.1]" : "text-[25px] leading-[1.15]"
        }`}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`leading-snug text-muted-foreground ${
            large ? "text-[15px]" : "text-[13.5px]"
          } ${align === "center" ? "max-w-[38ch]" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** The controls in this flow are taller than the shadcn default (h-9). */
export const AUTH_CONTROL = "h-9 rounded-lg";

/** The primary action at the foot of every auth card. */
export const AUTH_CTA =
  "h-10 w-full cursor-pointer gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed";
