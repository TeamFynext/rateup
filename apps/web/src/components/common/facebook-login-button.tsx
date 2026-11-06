import { useEffect, useId, useRef } from "react";

import { getLoginStatus, loadFacebookSdk, parseXfbml } from "@/lib/facebook-sdk";

/** `data-size` — one of the SDK's three button sizes. */
export type FacebookLoginButtonSize = "small" | "medium" | "large";

/** `data-layout` — square (`default`) or pill-shaped (`rounded`) corners. */
export type FacebookLoginButtonLayout = "default" | "rounded";

/** `data-button-type` — the label the SDK renders on the button. */
export type FacebookLoginButtonType = "continue_with" | "login_with";

/** `data-default-audience` — who write-permission posts default to. */
export type FacebookLoginAudience = "everyone" | "friends" | "only_me";

export interface FacebookLoginButtonProps {
  /** `data-app-id`. Defaults to `VITE_META_APP_ID`. */
  appId?: string;
  /** `data-button-type`. Defaults to the current **Continue with Facebook** button. */
  buttonType?: FacebookLoginButtonType;
  /** `data-layout`. */
  layout?: FacebookLoginButtonLayout;
  /** `data-size`. */
  size?: FacebookLoginButtonSize;
  /** `data-width` in pixels. The SDK treats it as a maximum, not a fixed width. */
  width?: number;
  /** `data-use-continue-as` — show "Continue as <name>" for a recognised user. */
  useContinueAs?: boolean;
  /** `data-auto-logout-link` — turn the button into a logout button once logged in. */
  autoLogoutLink?: boolean;
  /** `data-scope` — permissions to request, comma separated. */
  scope?: string;
  /** `data-default-audience`. */
  defaultAudience?: FacebookLoginAudience;
  /**
   * `data-onlogin`. Runs once the login flow finishes, with the status the SDK reports
   * — pass `response.authResponse` on to server-side registration code if you have any.
   */
  onLogin?: (response: FacebookLoginResponse) => void;
  /** Locale of the SDK bundle, and so of the button's own label. */
  locale?: string;
  className?: string;
}

/**
 * The official Facebook **Continue with Facebook** button.
 *
 * This renders the documented XFBML markup and lets the SDK build the real button, so
 * every setting in Meta's Login Button reference is honoured — including the ones no
 * hand-rolled button can reproduce (`use_continue_as`, `auto_logout_link`, the localised
 * label). Because the SDK only parses XFBML that exists when `FB.init()` runs, the
 * component re-parses its own subtree on mount and whenever a setting changes, which is
 * the `FB.XFBML.parse()` step the docs call for with dynamically added markup.
 *
 * The button cannot re-request declined permissions — Meta does not support that here.
 * Use `FB.login()` directly for a re-request (see `MetaLoginButton` for that shape).
 */
export function FacebookLoginButton({
  appId = import.meta.env.VITE_META_APP_ID,
  buttonType = "continue_with",
  layout = "default",
  size = "small",
  width,
  useContinueAs = false,
  autoLogoutLink = false,
  scope = "public_profile",
  defaultAudience = "friends",
  onLogin,
  locale = "en_US",
  className,
}: Readonly<FacebookLoginButtonProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  // `data-onlogin` is evaluated by the SDK as global JS, so the handler has to be
  // reachable by name off `window`. A per-instance id keeps two buttons apart.
  const callbackName = `fbLoginCallback_${useId().replaceAll(":", "")}`;
  const onLoginRef = useRef(onLogin);
  onLoginRef.current = onLogin;

  useEffect(() => {
    const scoped = window as unknown as Record<string, unknown>;
    // The SDK evaluates `data-onlogin` as bare JS and passes it nothing, so the status
    // is read back the way the docs prescribe: `FB.getLoginStatus()` after the flow.
    scoped[callbackName] = () => {
      void getLoginStatus(true).then((response) => onLoginRef.current?.(response));
    };
    return () => {
      delete scoped[callbackName];
    };
  }, [callbackName]);

  const settingsKey = [
    appId,
    buttonType,
    layout,
    size,
    width,
    useContinueAs,
    autoLogoutLink,
    scope,
    defaultAudience,
  ].join("|");

  useEffect(() => {
    let cancelled = false;
    loadFacebookSdk({ locale, appId })
      .then(() => {
        if (cancelled || !containerRef.current) return;
        return parseXfbml(containerRef.current);
      })
      .catch(() => {
        // A blocked or failed SDK leaves the placeholder empty; nothing else to undo.
      });
    return () => {
      cancelled = true;
    };
  }, [appId, locale, settingsKey]);

  return (
    <div ref={containerRef} className={className}>
      {/* Keyed so a settings change hands the SDK a fresh, unparsed node to render into. */}
      <div
        key={settingsKey}
        className="fb-login-button"
        data-app-id={appId}
        data-button-type={buttonType}
        data-layout={layout}
        data-size={size}
        data-width={width}
        data-use-continue-as={String(useContinueAs)}
        data-auto-logout-link={String(autoLogoutLink)}
        data-scope={scope}
        data-default-audience={defaultAudience}
        data-onlogin={onLogin ? `window.${callbackName}()` : undefined}
      />
    </div>
  );
}
