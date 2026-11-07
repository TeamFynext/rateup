import { useResolvedTheme } from "@rateup/ui/components/theme-provider";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { RecipeFunctionOptions } from "supertokens-web-js/recipe/recipeModule/types";

/**
 * Cloudflare Turnstile for the SuperTokens endpoints the API guards with its CAPTCHA plugin
 * (sign-up and SMS codes; see apps/api/src/utils/supertoken/captcha.ts). With no
 * VITE_TURNSTILE_SITE_KEY nothing loads and requests go out as before.
 *
 * Made for Turnstile's Managed mode: Cloudflare checks every visitor in the background and
 * asks for a click only when it judges one risky. <CaptchaSlot /> starts the check when the
 * form loads and stays empty unless that click is needed (`appearance: "interaction-only"`),
 * so most visitors never see it. Submitting takes the token; a token is single-use, so the
 * widget resets after each one is taken. A form with no slot (the phone code request) gets
 * a one-off widget, run on submit, that shows only if a click is needed.
 */
export const CAPTCHA_SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** A CAPTCHA problem the visitor can act on; its message is safe to show. */
export class CaptchaError extends Error {}

let scriptPromise: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing"));
    script.onerror = () => {
      scriptPromise = undefined;
      script.remove();
      reject(new CaptchaError("Could not load the security check. Reload the page."));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

/** The widget a mounted <CaptchaSlot /> holds. */
type ShownWidget = {
  token: string | null;
  /** Cloudflare is showing the checkbox and waiting for the visitor. */
  needsClick: boolean;
  /** Turnstile cannot run in this browser, so no token will ever come. */
  unsupported: boolean;
  /** Submits waiting on a check still running in the background. */
  waiters: ((token: string | null) => void)[];
  reset: () => void;
};
let shown: ShownWidget | null = null;

/** How long a submit waits for a background check before giving up. */
const WAIT_MS = 10_000;

function settle(widget: ShownWidget, token: string | null) {
  widget.token = token;
  for (const resolve of widget.waiters.splice(0)) resolve(token);
}

/** Settings shared by every widget we render; see Cloudflare's widget configuration docs. */
function baseOptions(action: CaptchaAction, language: string) {
  return {
    sitekey: CAPTCHA_SITE_KEY,
    // Names the check in Cloudflare's Turnstile analytics.
    action,
    language,
    // The token goes in the SuperTokens body, so no hidden <input> is needed.
    "response-field": false,
  };
}

/** What a check guards, for Cloudflare's analytics (letters, digits, `_` and `-` only). */
export type CaptchaAction = "signup" | "sms-code";

/** Turnstile's spot in a form, above the submit button. Empty unless a click is needed. */
export function CaptchaSlot({ action }: Readonly<{ action: CaptchaAction }>) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();
  const { i18n } = useTranslation();
  const language = i18n.language;

  useEffect(() => {
    const element = container.current;
    if (!CAPTCHA_SITE_KEY || !element) return;
    const widget: ShownWidget = {
      token: null,
      needsClick: false,
      unsupported: false,
      waiters: [],
      reset: () => {},
    };
    shown = widget;
    let widgetId: string | undefined;
    let unmounted = false;

    loadTurnstile()
      .then((turnstile) => {
        if (unmounted) return;
        widgetId = turnstile.render(element, {
          ...baseOptions(action, language),
          theme,
          size: "flexible",
          appearance: "interaction-only",
          callback: (token: string) => settle(widget, token),
          "expired-callback": () => settle(widget, null),
          "error-callback": (code: string) => {
            console.error("Turnstile error", code);
            settle(widget, null);
          },
          "unsupported-callback": () => {
            widget.unsupported = true;
            settle(widget, null);
          },
          "before-interactive-callback": () => {
            widget.needsClick = true;
            // A submit waiting in the background now needs the visitor; let it say so.
            settle(widget, null);
          },
          "after-interactive-callback": () => {
            widget.needsClick = false;
          },
        });
        widget.reset = () => {
          widget.token = null;
          if (widgetId) turnstile.reset(widgetId);
        };
      })
      .catch((err: unknown) => console.error(err));

    return () => {
      unmounted = true;
      settle(widget, null);
      if (shown === widget) shown = null;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [theme, language, action]);

  if (!CAPTCHA_SITE_KEY) return null;
  // Flexible fills the form but is never narrower than 300px. On a phone the form is about
  // 272px, so the negative margin lets the box use the card's side padding instead of
  // overflowing it (or falling back to Cloudflare's tall compact box). Zero when it fits.
  return <div ref={container} className="mx-[min(0px,calc((100%-300px)/2))] empty:hidden" />;
}

/** A one-off widget for a form without a slot; shows only if Cloudflare wants a click. */
async function invisibleToken(action: CaptchaAction): Promise<string> {
  const turnstile = await loadTurnstile();
  const holder = document.createElement("div");
  holder.className = "fixed bottom-4 left-1/2 z-50 -translate-x-1/2";
  document.body.append(holder);

  let widgetId: string | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      widgetId = turnstile.render(holder, {
        ...baseOptions(action, document.documentElement.lang || "auto"),
        execution: "execute",
        appearance: "interaction-only",
        callback: resolve,
        "error-callback": (code: string) => {
          console.error("Turnstile error", code);
          reject(new CaptchaError("The security check failed. Try again."));
        },
        "unsupported-callback": () => reject(new CaptchaError(UNSUPPORTED)),
        "timeout-callback": () =>
          reject(new CaptchaError("The security check timed out. Try again.")),
      });
      turnstile.execute(widgetId);
    });
  } finally {
    if (widgetId) turnstile.remove(widgetId);
    holder.remove();
  }
}

const CLICK_NEEDED = "Tick the security check above, then try again.";
const UNSUPPORTED = "This browser can't run our security check. Update it or try another browser.";

/**
 * A Turnstile token for the next SuperTokens call, or null when CAPTCHA is off. Waits for a
 * check still running in the background; throws a CaptchaError when the visitor has to click
 * or the check does not finish.
 */
export async function getCaptchaToken(action: CaptchaAction): Promise<string | null> {
  if (!CAPTCHA_SITE_KEY) return null;
  const widget = shown;
  if (!widget) return invisibleToken(action);

  if (!widget.token) {
    if (widget.unsupported) throw new CaptchaError(UNSUPPORTED);
    if (widget.needsClick) throw new CaptchaError(CLICK_NEEDED);
    await new Promise<string | null>((resolve) => {
      widget.waiters.push(resolve);
      setTimeout(() => resolve(null), WAIT_MS);
    });
  }
  const token = widget.token;
  if (!token) {
    if (widget.unsupported) throw new CaptchaError(UNSUPPORTED);
    throw new CaptchaError(
      widget.needsClick ? CLICK_NEEDED : "The security check didn't finish. Try again.",
    );
  }
  // Spent by this request: the widget fetches a fresh one for any retry.
  widget.reset();
  return token;
}

/** Adds the token to a SuperTokens request body, in the shape the API's plugin reads. */
export function captchaOptions(token: string | null): { options?: RecipeFunctionOptions } {
  if (!token) return {};
  return {
    options: {
      preAPIHook: async ({ url, requestInit }) => {
        // SuperTokens always sends these as a JSON string.
        const body = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : {};
        return {
          url,
          requestInit: {
            ...requestInit,
            body: JSON.stringify({ ...body, captcha: token, captchaType: "turnstile" }),
          },
        };
      },
    },
  };
}
