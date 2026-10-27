import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDeviceMobile,
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

import { Button } from "./button.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PhonePlatform = "instagram" | "whatsapp" | "facebook";

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
          {open && <PhoneSimulator />}
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
      <IconDeviceMobile className="size-4" />
      {label ?? t("Preview")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Phone hardware frame
// ---------------------------------------------------------------------------

export function PhoneFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative mx-auto h-150 w-73 rounded-[3rem] border-[3px] border-muted-foreground/30 bg-black p-2 shadow-xl">
      {/* The iPhone 18 Pro's narrower Dynamic Island: centred on the status bar's middle line. */}
      <div className="absolute top-4.5 left-1/2 z-10 h-5 w-18 -translate-x-1/2 rounded-full bg-black" />
      <div className="flex h-full flex-col overflow-hidden rounded-[2.25rem] bg-background">
        {children}
      </div>
      {/* <div className="absolute bottom-2 left-1/2 h-1 w-25 -translate-x-1/2 rounded-full bg-muted-foreground/30" /> */}
    </div>
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
};

function PhoneSimulator() {
  const { screen, platform, goHome, openApp } = usePhonePreview();
  const { appContent } = usePhonePreviewContent();

  return (
    <PhoneFrame>
      {screen === "home" ? (
        <HomeScreen platform={platform} onOpenApp={openApp} />
      ) : (
        <AppScreen onGoHome={goHome}>{appContent}</AppScreen>
      )}
    </PhoneFrame>
  );
}

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
function StatusBar({ variant = "light" }: Readonly<{ variant?: "light" | "dark" }>) {
  // iOS shows "9:41", never "09:41 AM".
  const timeStr = new Date()
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s?[AP]M$/i, "");
  const isLight = variant === "light";

  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center justify-between pr-6 pl-8",
        isLight ? "text-white" : "text-foreground",
      )}
    >
      <span className="w-12 text-center text-[13px] font-semibold tracking-tight tabular-nums">
        {timeStr}
      </span>
      <div className="flex items-center gap-[5px]">
        <SignalGlyph />
        <WifiGlyph />
        <BatteryGlyph />
      </div>
    </div>
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
  return (
    <div className="flex h-full flex-col">
      <StatusBar variant="dark" />
      {/* App content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>

      {/* Home bar */}
      <div className="flex justify-center pb-1 pt-1.5">
        <button
          type="button"
          className="h-1 w-25 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50 active:bg-muted-foreground/70"
          onClick={onGoHome}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DM screen building blocks (shared by Instagram / Facebook / WhatsApp previews)
// ---------------------------------------------------------------------------

export function DmHeader({ name }: Readonly<{ name: string }>) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <span className="text-xs text-muted-foreground">←</span>
      <div className="size-5 rounded-full bg-linear-to-br from-purple-400 to-pink-400" />
      <span className="text-xs font-semibold">{name}</span>
    </div>
  );
}

export function MessagingInput({ trailing }: Readonly<{ trailing?: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <div className="mt-auto flex items-center gap-2 border-t px-3 py-2">
      <div className="flex-1 rounded-full border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        {t("Message...")}
      </div>
      {trailing}
    </div>
  );
}
