/**
 * Loader for the Facebook JS SDK.
 *
 * The XFBML Login Button (`<div class="fb-login-button">`) is rendered by the SDK, so
 * every consumer needs the SDK loaded and `FB.init()` run before its markup means
 * anything. This module keeps that a single-flight promise: repeated calls share one
 * script tag and one `fbAsyncInit`, and callers that arrive after the SDK is ready
 * resolve immediately instead of waiting on an `fbAsyncInit` that will never fire again.
 */

const FB_SDK_SCRIPT_ID = "facebook-jssdk";

/** Graph API version the app is pinned to. */
export const FB_SDK_VERSION = "v25.0";

export interface FacebookSdkOptions {
  /** Defaults to `VITE_META_APP_ID`. */
  appId?: string;
  /** Locale of the SDK bundle, and so of the button's label. */
  locale?: string;
  /** Parse XFBML tags present at init time. */
  xfbml?: boolean;
  /** Keep a session cookie so server-side code can read the signed request. */
  cookie?: boolean;
  /** Fetch the login status during init. */
  status?: boolean;
}

let sdkPromise: Promise<void> | null = null;

/**
 * Loads and initialises the SDK, at most once per page.
 *
 * Options only apply to the first call — later calls resolve against the SDK that is
 * already initialised, because `FB.init()` cannot be meaningfully re-run.
 */
export function loadFacebookSdk(options: FacebookSdkOptions = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const {
    appId = import.meta.env.VITE_META_APP_ID,
    locale = "en_US",
    xfbml = true,
    cookie = true,
    status = true,
  } = options;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (globalThis.FB) {
      resolve();
      return;
    }

    globalThis.fbAsyncInit = function () {
      globalThis.FB?.init({
        appId,
        autoLogAppEvents: true,
        cookie,
        status,
        xfbml,
        version: FB_SDK_VERSION,
      });
      resolve();
    };

    // A script tag without `FB` means another caller is mid-load; the shared
    // `fbAsyncInit` above will resolve this promise when it lands.
    if (document.getElementById(FB_SDK_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = FB_SDK_SCRIPT_ID;
    script.src = `https://connect.facebook.net/${locale}/sdk.js`;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load the Facebook JS SDK"));
    };
    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Re-parses XFBML inside `element` (the whole document when omitted).
 *
 * Needed whenever `fb-*` markup is added after `FB.init()` ran — which, in React, is
 * every mount and every settings change.
 */
export function parseXfbml(element?: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    if (!globalThis.FB?.XFBML) {
      resolve();
      return;
    }
    globalThis.FB.XFBML.parse(element, () => resolve());
  });
}

/** Current login status, or `unknown` when the SDK never loaded. */
export function getLoginStatus(force = false): Promise<FacebookLoginResponse> {
  return new Promise((resolve) => {
    if (!globalThis.FB?.getLoginStatus) {
      resolve({ status: "unknown" });
      return;
    }
    globalThis.FB.getLoginStatus((response) => resolve(response), force);
  });
}

/** The bits of a viewer's profile the "Continue as" button shows. */
export interface FacebookProfile {
  name: string;
  pictureUrl?: string;
}

/**
 * Reads the signed-in viewer's name and profile picture, or `null` when nobody is
 * signed in to this app in this browser — which is exactly when the button falls back
 * to its plain "Continue with Facebook" label.
 */
export async function getFacebookProfile(): Promise<FacebookProfile | null> {
  const { status } = await getLoginStatus();
  if (status !== "connected" || !globalThis.FB?.api) return null;

  return new Promise((resolve) => {
    globalThis.FB?.api?.("/me", { fields: "name,picture" }, (response) => {
      if (!response?.name || response.error) {
        resolve(null);
        return;
      }
      resolve({ name: response.name, pictureUrl: response.picture?.data?.url });
    });
  });
}
