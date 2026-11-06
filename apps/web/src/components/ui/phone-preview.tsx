import { Button } from "@rateup/ui/components/button";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDeviceMobile,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { useRouterState } from "@tanstack/react-router";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { PhoneMockupCard } from "./phone-mockup.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The app the phone opens. `browser` is for web pages, e.g. a link page. */
export type PhonePlatform = "instagram" | "whatsapp" | "facebook" | "browser";

interface PhonePreviewState {
  open: boolean;
  screen: "home" | PhonePlatform;
  platform: PhonePlatform | null;
  openPreview: (platform: PhonePlatform, content: ReactNode, toolbar?: ReactNode) => void;
  closePreview: () => void;
  goHome: () => void;
  openApp: (platform: PhonePlatform) => void;
  updateContent: (content: ReactNode, toolbar?: ReactNode) => void;
}

interface PhonePreviewContent {
  appContent: ReactNode | null;
  /** Page-owned controls shown above the phone, e.g. which channel to preview. */
  toolbar: ReactNode | null;
}

const PhonePreviewContext = createContext<PhonePreviewState>({
  open: false,
  screen: "home",
  platform: null,
  openPreview: () => {},
  closePreview: () => {},
  goHome: () => {},
  openApp: () => {},
  updateContent: () => {},
});

// The content lives in its own context, read only by the panel. The page that owns a preview
// pushes new content on every render it makes, so if pushing re-rendered that page through the
// shared context, it would build fresh elements and push again — an endless update loop.
const PhonePreviewContentContext = createContext<PhonePreviewContent>({
  appContent: null,
  toolbar: null,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PhonePreviewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"home" | PhonePlatform>("home");
  const [appContent, setAppContent] = useState<ReactNode | null>(null);
  const [toolbar, setToolbar] = useState<ReactNode | null>(null);
  const [platform, setPlatform] = useState<PhonePlatform | null>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // The preview content belongs to the page that opened it, so drop it on navigation. This runs
  // during render, not in an effect: a parent's effect runs after its children's, so an effect
  // here would close a preview the new page had just opened on mount.
  const [shownPathname, setShownPathname] = useState(pathname);
  if (pathname !== shownPathname) {
    setShownPathname(pathname);
    setOpen(false);
    setAppContent(null);
    setToolbar(null);
    setPlatform(null);
    setScreen("home");
  }

  const openPreview = useCallback((p: PhonePlatform, content: ReactNode, bar?: ReactNode) => {
    setPlatform(p);
    setAppContent(content);
    setToolbar(bar ?? null);
    setScreen(p);
    setOpen(true);
  }, []);

  const closePreview = useCallback(() => setOpen(false), []);
  const goHome = useCallback(() => setScreen("home"), []);

  const openApp = useCallback(
    (p: PhonePlatform) => {
      if (p === platform) {
        setScreen(p);
      }
    },
    [platform],
  );

  const updateContent = useCallback((content: ReactNode, bar?: ReactNode) => {
    setAppContent(content);
    setToolbar(bar ?? null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      screen,
      platform,
      openPreview,
      closePreview,
      goHome,
      openApp,
      updateContent,
    }),
    [open, screen, platform, openPreview, closePreview, goHome, openApp, updateContent],
  );

  const content = useMemo(() => ({ appContent, toolbar }), [appContent, toolbar]);

  return (
    <PhonePreviewContext value={value}>
      <PhonePreviewContentContext value={content}>{children}</PhonePreviewContentContext>
    </PhonePreviewContext>
  );
}

export function usePhonePreview() {
  return useContext(PhonePreviewContext);
}

function usePhonePreviewContent() {
  return useContext(PhonePreviewContentContext);
}

// ---------------------------------------------------------------------------
// Panel (right sidebar)
// ---------------------------------------------------------------------------

export function PhonePreviewPanel() {
  const { open, closePreview } = usePhonePreview();
  const { toolbar } = usePhonePreviewContent();
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "h-dvh shrink-0 border-l bg-background transition-all duration-300 ease-in-out overflow-hidden",
        open ? "w-90" : "w-0 border-l-0",
      )}
    >
      <div className="flex h-full w-90 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <IconDeviceMobile className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t("Device Preview")}</span>
          </div>
          <Button
            aria-label={t("Close")}
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={closePreview}
          >
            <IconX className="size-4" />
          </Button>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-4">
          {open && toolbar}
          {/* The phone sizes itself to this box, so the whole handset fits on a laptop screen. */}
          {open && (
            <div className="flex min-h-136 w-full flex-1 justify-center">
              <PhoneSimulator className="h-full max-h-152 w-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button (trigger from any page)
// ---------------------------------------------------------------------------

export function PhonePreviewButton({
  children,
  platform,
  label,
  toolbar,
  defaultOpen = false,
}: Readonly<{
  children: ReactNode;
  platform: PhonePlatform;
  label?: string;
  /** Shown in the panel above the phone while this preview is open. */
  toolbar?: ReactNode;
  /** Open the preview when the button mounts. Closing it afterwards is left to the user. */
  defaultOpen?: boolean;
}>) {
  const {
    open,
    openPreview,
    closePreview,
    platform: activePlatform,
    updateContent,
  } = usePhonePreview();
  const { t } = useTranslation();
  const isActive = open && activePlatform === platform;

  const openOnMount = useEffectEvent(() => {
    if (defaultOpen) openPreview(platform, children, toolbar);
  });
  useEffect(() => openOnMount(), []);

  useEffect(() => {
    if (isActive) {
      updateContent(children, toolbar);
    }
  }, [children, toolbar, isActive, updateContent]);

  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={() => {
        if (isActive) {
          closePreview();
        } else {
          openPreview(platform, children, toolbar);
        }
      }}
    >
      <IconDeviceMobile data-icon="inline-start" />
      {label ?? t("Preview")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Phone hardware frame
// ---------------------------------------------------------------------------

export function PhoneFrame({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  // The screens draw their own home bar (the app one is the tap target for "go home").
  return (
    <PhoneMockupCard
      className={cn("mx-auto w-73 shrink-0 drop-shadow-xl", className)}
      showHomeIndicator={false}
      screenClassName="bg-background"
    >
      <div className="flex h-full flex-col">{children}</div>
    </PhoneMockupCard>
  );
}

// ---------------------------------------------------------------------------
// Phone simulator (home screen + app navigation)
// ---------------------------------------------------------------------------

const APP_META: Record<
  PhonePlatform,
  { icon: typeof IconBrandInstagram; label: string; gradient: string }
> = {
  instagram: {
    icon: IconBrandInstagram,
    label: "Instagram",
    gradient: "from-purple-500 via-pink-500 to-orange-400",
  },
  whatsapp: {
    icon: IconBrandWhatsapp,
    label: "WhatsApp",
    gradient: "from-green-500 to-green-600",
  },
  facebook: {
    icon: IconBrandFacebook,
    label: "Facebook",
    gradient: "from-blue-600 to-blue-500",
  },
  browser: {
    icon: IconWorld,
    label: "Browser",
    gradient: "from-sky-500 to-blue-600",
  },
};

function PhoneSimulator({ className }: Readonly<{ className?: string }>) {
  const { screen, platform, goHome, openApp } = usePhonePreview();
  const { appContent } = usePhonePreviewContent();

  return (
    <PhoneFrame className={className}>
      {screen === "home" ? (
        <HomeScreen platform={platform} onOpenApp={openApp} />
      ) : (
        <AppScreen onGoHome={goHome}>{appContent}</AppScreen>
      )}
    </PhoneFrame>
  );
}

/** The status bar takes the open app's top-bar colour, as it does on a phone. */
const STATUS_BAR_LOOK: Record<PhonePlatform, string> = {
  whatsapp: "bg-white text-[#111b21] dark:bg-[#0b141a] dark:text-[#e9edef]",
  instagram: "bg-white text-black dark:bg-black dark:text-white",
  facebook: "bg-white text-black dark:bg-black dark:text-white",
  browser: "",
};

/** iOS's cellular bars: four, rising, rounded. */
function SignalGlyph() {
  return (
    <svg viewBox="0 0 18 12" aria-hidden className="h-[11px] w-[17px] fill-current">
      <rect x="0" y="7.5" width="3.2" height="4.5" rx="1" />
      <rect x="4.8" y="5.2" width="3.2" height="6.8" rx="1" />
      <rect x="9.6" y="2.6" width="3.2" height="9.4" rx="1" />
      <rect x="14.4" y="0" width="3.2" height="12" rx="1" />
    </svg>
  );
}

/** iOS's Wi-Fi fan: three arcs over a dot-like wedge. */
function WifiGlyph() {
  return (
    <svg viewBox="0 0 16 12" aria-hidden className="h-[11px] w-[15px] fill-current">
      <path d="M8 2.3c2.3 0 4.4.9 6 2.4.2.2.4.2.6 0l1.1-1.1c.2-.2.2-.5 0-.7A11.2 11.2 0 0 0 8 0C5 0 2.3 1.1.3 3c-.2.2-.2.5 0 .7l1.1 1.1c.2.2.4.2.6 0A8.6 8.6 0 0 1 8 2.3Z" />
      <path d="M8 6.1c1.2 0 2.4.4 3.3 1.2.2.2.4.2.6 0L13 6.2c.2-.2.2-.5 0-.7a7.6 7.6 0 0 0-10 0c-.2.2-.2.5 0 .7l1.1 1.1c.2.2.4.2.6 0 .9-.8 2.1-1.2 3.3-1.2Z" />
      <path d="M10.4 9c.2-.2.2-.5 0-.7a3.6 3.6 0 0 0-4.8 0c-.2.2-.2.5 0 .7l2.1 2.1c.2.2.4.2.6 0L10.4 9Z" />
    </svg>
  );
}

/** iOS's battery: a faint rounded case, a solid charge, and the terminal nub. */
function BatteryGlyph({ level = 0.8 }: Readonly<{ level?: number }>) {
  return (
    <svg viewBox="0 0 27 13" aria-hidden className="h-[12px] w-[25px]">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="12"
        rx="3.8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
      />
      <rect x="2" y="2" width={20 * level} height="9" rx="2.5" fill="currentColor" />
      <path
        d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

/** The iOS status bar: time left of the island, signal, Wi-Fi and battery right of it. */
function StatusBar({
  variant = "light",
  className,
}: Readonly<{ variant?: "light" | "dark"; className?: string }>) {
  // iOS shows "9:41", never "09:41 AM".
  const timeStr = new Date()
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?[AP]M$/i, "");
  const isLight = variant === "light";

  return (
    <div
      className={cn(
        // As on iOS: the time centred in the space left of the camera cutout, the icons centred
        // in the space right of it, so nothing runs into the cutout however narrow the phone.
        "grid h-9 shrink-0 grid-cols-[1fr_5.25rem_1fr] items-center px-2",
        isLight ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="justify-self-center text-[13px] font-semibold tracking-tight tabular-nums">
        {timeStr}
      </span>
      <span aria-hidden />
      <div className="flex items-center gap-[5px] justify-self-center">
        <SignalGlyph />
        <WifiGlyph />
        <BatteryGlyph />
      </div>
    </div>
  );
}

/**
 * One app screen on a phone, drawn in the page rather than the preview panel: the frame, the
 * app's status bar and `children`. For an editor that keeps its preview beside the form.
 */
export function PhoneScreen({
  platform,
  children,
  className,
}: Readonly<{ platform: PhonePlatform; children: ReactNode; className?: string }>) {
  return (
    <PhoneFrame className={className}>
      <div className="relative flex h-full flex-col">
        <StatusBar variant="dark" className={STATUS_BAR_LOOK[platform]} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <div aria-hidden className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center">
          <div className="h-1 w-25 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function HomeScreen({
  platform,
  onOpenApp,
}: Readonly<{
  platform: PhonePlatform | null;
  onOpenApp: (p: PhonePlatform) => void;
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-linear-to-b from-slate-900 to-slate-800 text-white">
      <StatusBar variant="light" />

      {/* Date & greeting */}
      <div className="px-6 pt-8 pb-6">
        <p className="text-[11px] text-white/60">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* App grid */}
      <div className="flex-1 px-6">
        <div className="grid grid-cols-4 gap-y-6 gap-x-4">
          {(Object.entries(APP_META) as [PhonePlatform, (typeof APP_META)[PhonePlatform]][]).map(
            ([id, meta]) => {
              const hasContent = id === platform;
              return (
                <button
                  type="button"
                  key={id}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-transform active:scale-90",
                    !hasContent && "opacity-40",
                  )}
                  onClick={() => hasContent && onOpenApp(id)}
                  disabled={!hasContent}
                >
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl bg-linear-to-br shadow-lg",
                      meta.gradient,
                    )}
                  >
                    <meta.icon className="size-6 text-white" />
                  </div>
                  <span className="text-[9px] text-white/80">{meta.label}</span>
                </button>
              );
            },
          )}
        </div>

        {platform && (
          <p className="mt-8 text-center text-[10px] text-white/40">
            {t("Tap {app} to see preview", { app: APP_META[platform].label })}
          </p>
        )}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2 pt-4">
        <div className="h-1 w-25 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

function AppScreen({
  children,
  onGoHome,
}: Readonly<{
  children: ReactNode;
  onGoHome: () => void;
}>) {
  const { t } = useTranslation();
  const { platform } = usePhonePreview();
  return (
    <div className="relative flex h-full flex-col">
      <StatusBar variant="dark" className={platform ? STATUS_BAR_LOOK[platform] : undefined} />
      {/* App content runs to the bottom edge; the home bar floats over it, as on a real phone. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        {children}
      </div>

      {/* Home bar */}
      <div className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center">
        <button
          aria-label={t("Home")}
          type="button"
          className="h-1 w-25 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50 active:bg-muted-foreground/70"
          onClick={onGoHome}
        />
      </div>
    </div>
  );
}
