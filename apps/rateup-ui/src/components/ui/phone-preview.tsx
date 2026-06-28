import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconDeviceMobile,
  IconX,
} from "@tabler/icons-react";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
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

type PhonePreviewState = {
  open: boolean;
  screen: "home" | PhonePlatform;
  appContent: ReactNode | null;
  platform: PhonePlatform | null;
  openPreview: (platform: PhonePlatform, content: ReactNode) => void;
  closePreview: () => void;
  goHome: () => void;
  openApp: (platform: PhonePlatform) => void;
  updateContent: (content: ReactNode) => void;
};

const PhonePreviewContext = createContext<PhonePreviewState>({
  open: false,
  screen: "home",
  appContent: null,
  platform: null,
  openPreview: () => {},
  closePreview: () => {},
  goHome: () => {},
  openApp: () => {},
  updateContent: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PhonePreviewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"home" | PhonePlatform>("home");
  const [appContent, setAppContent] = useState<ReactNode | null>(null);
  const [platform, setPlatform] = useState<PhonePlatform | null>(null);

  const openPreview = useCallback((p: PhonePlatform, content: ReactNode) => {
    setPlatform(p);
    setAppContent(content);
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

  const updateContent = useCallback((content: ReactNode) => {
    setAppContent(content);
  }, []);

  const value = useMemo(
    () => ({
      open,
      screen,
      appContent,
      platform,
      openPreview,
      closePreview,
      goHome,
      openApp,
      updateContent,
    }),
    [open, screen, appContent, platform, openPreview, closePreview, goHome, openApp, updateContent],
  );

  return <PhonePreviewContext value={value}>{children}</PhonePreviewContext>;
}

export function usePhonePreview() {
  return useContext(PhonePreviewContext);
}

// ---------------------------------------------------------------------------
// Panel (right sidebar)
// ---------------------------------------------------------------------------

export function PhonePreviewPanel() {
  const { open, closePreview } = usePhonePreview();
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-40 h-dvh border-l bg-background transition-all duration-300 ease-in-out overflow-hidden",
        open ? "w-90" : "w-0 border-l-0",
      )}
    >
      <div className="flex h-full w-90 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <IconDeviceMobile className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t("Device Preview")}</span>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={closePreview}>
            <IconX className="size-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-4">
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
}: Readonly<{
  children: ReactNode;
  platform: PhonePlatform;
  label?: string;
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

  useEffect(() => {
    if (isActive) {
      updateContent(children);
    }
  }, [children, isActive, updateContent]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-muted-foreground", isActive && "text-primary")}
      onClick={() => {
        if (isActive) {
          closePreview();
        } else {
          openPreview(platform, children);
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
    <div className="relative mx-auto h-150 w-73 rounded-[3rem] border-[3px] border-muted-foreground/30 bg-black p-2.5 shadow-xl">
      <div className="absolute left-1/2 top-4.5 z-10 h-5.5 w-22.5 -translate-x-1/2 rounded-full bg-black" />
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
  const { screen, appContent, platform, goHome, openApp } = usePhonePreview();

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

function StatusBar({ variant = "light" }: Readonly<{ variant?: "light" | "dark" }>) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isLight = variant === "light";

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1">
      <span className={cn("text-[11px] font-medium", isLight ? "text-white" : "text-foreground")}>
        {timeStr}
      </span>
      <div className="flex items-center gap-1">
        <div className="flex items-end gap-0.5">
          {(["h-1", "h-1.5", "h-2", "h-2.5"] as const).map((h) => (
            <div
              key={h}
              className={cn("w-0.5 rounded-full", h, isLight ? "bg-white" : "bg-foreground")}
            />
          ))}
        </div>
        <span className={cn("ml-1 text-[9px]", isLight ? "text-white" : "text-foreground")}>
          5G
        </span>
        <div
          className={cn(
            "ml-1 h-2.5 w-5 rounded-sm border p-px",
            isLight ? "border-white/50" : "border-foreground/50",
          )}
        >
          <div className={cn("h-full w-3/4 rounded-xs", isLight ? "bg-white" : "bg-foreground")} />
        </div>
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
