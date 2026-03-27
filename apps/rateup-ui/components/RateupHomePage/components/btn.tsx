import Image from "next/image";

const C = {
  bg0: "#04091a",
  bg1: "#070f24",
  bg2: "#0b1530",
  bg3: "#0f1d3a",
  border: "rgba(255,255,255,0.07)",
  blue: "#1873E8",
  text1: "#ffffff",
  text2: "#94a3b8",
  text3: "#64748b",
  yellow: "#facc15",
};

export const imgBox = {
  background: C.bg3,
  borderRadius: 12,
  aspectRatio: "16/9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

type ButtonVariant = "primary" | "secondary" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function LandingButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base = "px-4 py-2 rounded-xl font-semibold transition";

  const variants = {
    primary:
      "text-[14px] relative border border-rateup-blue-4 bg-rateup-blue-2 text-white",
    secondary:
      "bg-rateup-light-blue text-rateup-dark-blue cursor-pointer hover:bg-rateup-darkblue-2",
    outline:
      "px-10 flex items-center justify-center  cursor-pointer text-rateup-blue border border-rateup-light-blue hover:bg-rateup-blue-4 hover:text-white transition bg-white py-2",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

const ICONS = {
  chevronRight: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 8L4 14L2.667 12.667L7.333 8L2.667 3.333L4 2L10 8Z"
    />
  ),
  chevronLeft: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 8L12 2L13.333 3.333L8.667 8L13.333 12.667L12 14L6 8Z"
    />
  ),
  chevronDown: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 10L2 4L3.333 2.667L8 7.333L12.667 2.667L14 4L8 10Z"
    />
  ),
  chevronUp: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 6L14 12L12.667 13.333L8 8.667L3.333 13.333L2 12L8 6Z"
    />
  ),
  arrowRight: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.293 2.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 9H3a1 1 0 110-2h8.586L8.293 3.707a1 1 0 010-1.414z"
    />
  ),
  plus: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"
    />
  ),
  star: (
    <path d="M8 1l1.854 3.756L14 5.528l-3 2.922.708 4.129L8 10.5l-3.708 2.08.708-4.13L2 5.529l4.146-.772L8 1z" />
  ),
  send: (
    <path d="M15.854.146a.5.5 0 01.11.54l-5.819 14.547a.75.75 0 01-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 01.124-1.33L15.314.037a.5.5 0 01.54.11z" />
  ),
};
export function BadgeIcon({
  icon = "chevronRight",
  iconColor = "#ffffff",
  badgeBg = "bg-[#001747]",
  size = "md",
  rounded = "rounded-lg",
  onClick,
  className = "",
}: {
  icon?: string;
  iconColor?: string;
  badgeBg?: string;
  size?: "sm" | "md" | "lg";
  rounded?: string;
  onClick?: () => void; // ✅ optional
  className?: string;
}) {
  const sizeMap = {
    sm: { wrap: "w-7 h-7", svgSize: 12 },
    md: { wrap: "w-10 h-10", svgSize: 16 },
    lg: { wrap: "w-12 h-12", svgSize: 20 },
  };
  const s = sizeMap[size] || sizeMap.md;
  const iconPath = ICONS[icon] || ICONS.chevronRight;

  return (
    <span
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center shrink-0",
        s.wrap,
        badgeBg,
        rounded,
        onClick ? "cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <svg
        width={s.svgSize}
        height={s.svgSize}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ fill: iconColor }}
      >
        {iconPath}
      </svg>
    </span>
  );
}

// ─── ArrowButton ──────────────────────────────────────────────────────────────
/**
 * ArrowButton — CTA button with a BadgeIcon badge on the right.
 *
 * Props:
 *  - label       {string}   Button text. Default: "Start Free Trial"
 *  - onClick     {function} Click handler
 *  - disabled    {boolean}  Default: false
 *  - type        {string}   "button" | "submit" | "reset". Default: "button"
 *  - fullWidth   {boolean}  Default: false
 *  - size        {string}   "sm" | "md" | "lg". Default: "md"
 *
 *  ── Appearance ──
 *  - bg          {string}   Tailwind bg class for button.        Default: "bg-[#2D74E0]"
 *  - hoverBg     {string}   Tailwind hover:bg class.             Default: "hover:bg-blue-500"
 *  - textColor   {string}   Tailwind text color class.           Default: "text-white"
 *
 *  ── Badge Icon ──
 *  - icon        {string}   Icon key (see BadgeIcon).            Default: "chevronRight"
 *  - iconColor   {string}   Hex fill color for the icon SVG.     Default: "#ffffff"
 *  - badgeBg     {string}   Tailwind bg class for badge.         Default: "bg-[#001747]"
 */
export function ArrowButton({
  label = "Start Free Trial",
  onClick,
  disabled = false,
  type = "button",
  fullWidth = false,
  size = "sm",
  bg = "bg-rateup-blue-2",
  hoverBg = "hover:bg-blue-500",
  hoverText = "",
  textColor = "text-white",
  icon = "chevronRight",
  iconColor = "#ffffff",
  badgeBg = "bg-[#001747]",
}: {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset"; // ✅ FIX
  fullWidth?: boolean;
  hoverText?: string;
  size?: "sm" | "md" | "lg";
  bg?: string;
  hoverBg?: string;
  textColor?: string;
  icon?: string;
  iconColor?: string;
  badgeBg?: string;
}) {
  const sizeMap = {
    sm: {
      wrap: "h-9 pl-3.5 pr-1 gap-3 rounded-xl",
      label: "text-sm font-semibold tracking-tight",
      badge: "sm",
    },
    md: {
      wrap: "h-12 pl-5 pr-1 gap-4 rounded-xl",
      label: "text-[15px] font-semibold tracking-tight",
      badge: "md",
    },
    lg: {
      wrap: "h-14 pl-6 pr-1 gap-5 rounded-2xl",
      label: "text-base font-semibold tracking-tight",
      badge: "lg",
    },
  } as const;
  const s = sizeMap[size] || sizeMap.md;

  return (
    <button
      type={type}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      aria-label={label}
      className={[
        "inline-flex items-center justify-between border-none outline-none",
        "transition-all duration-200 ease-in-out active:scale-95 px-9",
        s.wrap,
        bg,
        hoverBg,
        hoverText,
        textColor,
        fullWidth ? "w-full" : "w-auto min-w-35",
        disabled
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : "cursor-pointer",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`flex-1 text-left whitespace-nowrap ${s.label}`}>
        {label}
      </span>
      <BadgeIcon
        icon={icon}
        iconColor={iconColor}
        badgeBg={badgeBg}
        size={s.badge}
        rounded="rounded-lg"
      />
    </button>
  );
}
function GooglePlayButton({ href = "#" }: { href?: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        background: "#ffffff",
        border: "1.5px solid #D1D5DB",
        borderRadius: "8px",
        textDecoration: "none",
        flex: 1,
      }}
    >
      <Image
        src="/images/landing/logos/ico-playstore.png"
        alt="Google Play"
        width={18}
        height={18}
        className="object-contain"
      />
      <div
        style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
      >
        <span
          style={{
            fontSize: "8px",
            color: "#374151",
            letterSpacing: "0.03em",
            whiteSpace: "nowrap", // ← add this
          }}
        >
          GET IT ON
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.01em",
          }}
        >
          Google Play
        </span>
      </div>
    </a>
  );
}

function AppStoreButton({ href = "#" }: { href?: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        background: "#ffffff",
        border: "1.5px solid #D1D5DB",
        borderRadius: "8px",
        textDecoration: "none",
        flex: 1,
      }}
    >
      <Image
        src="/images/landing/logos/ico-apple.png"
        alt="App Store"
        width={18}
        height={18}
        className="object-contain"
      />
      <div
        style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
      >
        <span
          style={{ fontSize: "8px", color: "#374151", letterSpacing: "0.03em" }}
        >
          Download on the
        </span>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.01em",
          }}
        >
          App Store
        </span>
      </div>
    </a>
  );
}

export default function AppStoreButtons({
  googlePlayHref = "#",
  appStoreHref = "#",
}: {
  googlePlayHref?: string;
  appStoreHref?: string;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", paddingTop: "22px" }}>
      <GooglePlayButton href={googlePlayHref} />
      <AppStoreButton href={appStoreHref} />
    </div>
  );
}
export function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "linear-gradient(to right, #2D74E0, #66D7FF)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}
