import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import type { FacebookProfile } from "@/lib/facebook-sdk";
import { getFacebookProfile, loadFacebookSdk } from "@/lib/facebook-sdk";
import { cn } from "@/lib/utils";

import type {
  FacebookLoginButtonLayout,
  FacebookLoginButtonSize,
  FacebookLoginButtonType,
} from "./facebook-login-button";

/**
 * Meta's brand spec for the button, as close as CSS gets to what the SDK renders.
 * Heights and type sizes track the three `data-size` options.
 */
const SIZE_STYLES: Record<FacebookLoginButtonSize, string> = {
  small: "h-7 gap-1.5 px-3 text-xs",
  medium: "h-8 gap-2 px-3.5 text-sm",
  large: "h-10 gap-2 px-6 text-base",
};

/** How the button is coloured. */
export type FacebookBrandButtonVariant = "blue" | "white" | "black";

/**
 * Facebook blue is the button people recognise, so it stays the default. `white` and
 * `black` are the documented fallback for surfaces that cannot carry the brand blue —
 * the docs allow black and white, and nothing else.
 */
const VARIANT_STYLES: Record<FacebookBrandButtonVariant, string> = {
  blue: cn(
    "bg-[#1877F2] text-white",
    "hover:bg-[#166FE5] active:bg-[#1461CC] focus-visible:outline-[#1877F2]",
  ),
  white: cn(
    "border border-[#1C1E21]/20 bg-white text-[#1C1E21]",
    "hover:bg-[#F2F3F5] active:bg-[#E4E6EB] focus-visible:outline-[#1C1E21]",
  ),
  black: cn(
    "bg-[#1C1E21] text-white",
    "hover:bg-[#33363B] active:bg-[#000000] focus-visible:outline-[#1C1E21]",
  ),
};

/** Disc and "f" colours per variant — the mark itself is never redrawn. */
const GLYPH_COLORS: Record<FacebookBrandButtonVariant, { disc: string; mark: string }> = {
  blue: { disc: "#FFFFFF", mark: "#1877F2" },
  white: { disc: "#1877F2", mark: "#FFFFFF" },
  black: { disc: "#FFFFFF", mark: "#1C1E21" },
};

const ICON_SIZE: Record<FacebookLoginButtonSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
};

/** The official mark: a disc carrying the "f", in the two brand-approved colourways. */
function FacebookGlyph({
  size,
  variant,
}: Readonly<{ size: number; variant: FacebookBrandButtonVariant }>) {
  const { disc, mark } = GLYPH_COLORS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="18" cy="18" r="18" fill={disc} />
      <path
        fill={mark}
        d="M25.01 23.2l.8-5.2h-5v-3.37c0-1.43.7-2.82 2.94-2.82h2.27V7.38S23.96 7.03 22 7.03c-4.11 0-6.8 2.49-6.8 7V18h-4.57v5.2h4.57v12.58a18.1 18.1 0 0 0 5.62 0V23.2h4.2Z"
      />
    </svg>
  );
}

/** The viewer's profile picture, sized to match the glyph it replaces. */
function ProfilePicture({ src, size }: Readonly<{ src: string; size: number }>) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 rounded-full object-cover"
    />
  );
}

export interface FacebookBrandButtonProps extends Omit<
  ComponentProps<"button">,
  "type" | "children"
> {
  /** Mirrors `button_type`: the label the SDK would render. */
  buttonType?: FacebookLoginButtonType;
  /** Mirrors `layout`: square (`default`) or pill (`rounded`). */
  layout?: FacebookLoginButtonLayout;
  /** Mirrors `size`. */
  size?: FacebookLoginButtonSize;
  /** Brand blue, or the black-and-white fallback for surfaces that cannot carry it. */
  variant?: FacebookBrandButtonVariant;
  /** Mirrors `width`, in pixels — a maximum, as with the SDK button. */
  width?: number;
  /** Replaces the label, for a flow that needs its own wording. */
  label?: string;
  /**
   * Mirrors `use_continue_as`: when the viewer is already signed in to Facebook for
   * this app in this browser, the button reads "Continue as <name>". Falls back to the
   * ordinary label for everyone else.
   */
  useContinueAs?: boolean;
  /** Show the viewer's Facebook profile picture in place of the mark. Optional, per the docs. */
  showProfilePicture?: boolean;
  /** Localises the "Continue as" label. */
  formatContinueAs?: (name: string) => string;
  /** Rendered before the label — a spinner while a request is in flight. */
  adornment?: React.ReactNode;
}

/**
 * The **Continue with Facebook** button, hand-built to Meta's brand spec.
 *
 * Use `FacebookLoginButton` wherever the SDK's own XFBML button will do — it is the
 * authority on styling and gets `use_continue_as` and `auto_logout_link` for free. This
 * one exists for the flows XFBML cannot express (WhatsApp Embedded Signup needs a
 * `config_id`, which the XFBML button has no attribute for), so that those buttons still
 * carry the right logo, colour, and geometry instead of app-primary styling.
 */
export function FacebookBrandButton({
  buttonType = "continue_with",
  layout = "default",
  size = "large",
  variant = "blue",
  width,
  label,
  useContinueAs = false,
  showProfilePicture = true,
  formatContinueAs = (name) => `Continue as ${name}`,
  adornment,
  className,
  style,
  disabled,
  ...props
}: Readonly<FacebookBrandButtonProps>) {
  const profile = useFacebookProfile(useContinueAs);
  const picture = showProfilePicture ? profile?.pictureUrl : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      style={{ maxWidth: width, ...style }}
      className={cn(
        // Helvetica, as Meta sets the label, with app fonts only as a fallback.
        "inline-flex w-fit items-center justify-center font-bold whitespace-nowrap",
        "[font-family:Helvetica,'Helvetica Neue',Arial,sans-serif] tracking-[0.01em]",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        layout === "rounded" ? "rounded-full" : "rounded",
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {adornment}
      {picture ? (
        <ProfilePicture src={picture} size={ICON_SIZE[size]} />
      ) : (
        <FacebookGlyph size={ICON_SIZE[size]} variant={variant} />
      )}
      {/* The call to action always lives inside the button, and never wraps it out of shape. */}
      <span className="min-w-0 truncate">
        {profile
          ? formatContinueAs(profile.name)
          : (label ??
            (buttonType === "login_with" ? "Log in with Facebook" : "Continue with Facebook"))}
      </span>
    </button>
  );
}

/**
 * The viewer's profile, once the SDK confirms they are signed in to this app here.
 *
 * Stays `null` while disabled, on the server, and for signed-out viewers — the button
 * simply keeps its ordinary label in all three cases.
 */
function useFacebookProfile(enabled: boolean): FacebookProfile | null {
  const [profile, setProfile] = useState<FacebookProfile | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    loadFacebookSdk()
      .then(getFacebookProfile)
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => {
        // No SDK, no name to greet: the plain label stands.
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return profile;
}
