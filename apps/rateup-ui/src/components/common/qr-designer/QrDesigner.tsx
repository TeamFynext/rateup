import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconDownload,
  IconPrinter,
  IconUpload,
} from "@tabler/icons-react";
import { isEqual } from "lodash";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ColorField } from "@/components/common/color-field.tsx";
import { CopyButton } from "@/components/common/copy-button.tsx";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { useArtboardExport } from "@/components/dashboard/loyalty/poster/usePosterExport.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";
import { rateupIcon } from "@/utils/constants.ts";

import { QrArtboard } from "./QrArtboard.tsx";
import {
  DEFAULT_QR_DESIGN,
  LOGO_SHAPES,
  LOGO_SIZE_BASE,
  type QrDesign,
  qrPresets,
  scanWarning,
  TRANSPARENT,
} from "./qrDesign.ts";
import { QrThumbnail } from "./QrThumbnail.tsx";

/** Printed about 6cm across: big enough to scan from arm's length on a counter card. */
const PRINT_WIDTH_MM = 60;

/** Where the background is see-through, show it the way image editors do. */
const CHECKERBOARD =
  "bg-[repeating-conic-gradient(var(--border)_0%_25%,var(--background)_0%_50%)] bg-size-[12px_12px]";

/** Saved settings went through a form post, so their numbers and booleans may be strings. */
function normalise(initial?: Partial<QrDesign> | null): QrDesign {
  const merged = { ...DEFAULT_QR_DESIGN, ...initial };
  return {
    ...merged,
    logoSize: Number(merged.logoSize) || DEFAULT_QR_DESIGN.logoSize,
    logoBorderRadius: Number(merged.logoBorderRadius) || 0,
    isLogoEnabled: String(merged.isLogoEnabled) !== "false",
    logoFile: merged.logoFile && merged.logoFile !== "null" ? merged.logoFile : null,
  };
}

/** An uploaded file previews from an object URL; a saved logo is already a URL. */
function useLogoSrc(logo: QrDesign["logoFile"]) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!(logo instanceof File)) return;
    const url = URL.createObjectURL(logo);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);
  if (logo instanceof File) return objectUrl;
  return typeof logo === "string" ? logo : null;
}

interface QrDesignerProps {
  url: string;
  fileName: string;
  initial?: Partial<QrDesign> | null;
  /** Nothing to hand out yet, as with an unpublished page: export and copy are off. */
  disabled?: boolean;
  disabledReason?: string;
  /** Resolves true once the design is stored. Without it the design is for this download only. */
  onSave?: (state: QrDesign) => Promise<boolean>;
  /** Plain sections instead of cards, for a designer that already sits inside one. */
  flat?: boolean;
}

/**
 * Controls on the left, the code on the right exactly as it downloads and prints. Seeded once
 * from `initial`, so mount it after the settings load.
 */
export function QrDesigner({
  url,
  fileName,
  initial,
  disabled,
  disabledReason,
  onSave,
  flat = false,
}: Readonly<QrDesignerProps>) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(() => normalise(initial));
  const [state, setState] = useState(saved);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<QrDesign>) => setState((prev) => ({ ...prev, ...patch }));

  const boardRef = useRef<HTMLDivElement>(null);
  const { exporting, exportSafe, download, print } = useArtboardExport(boardRef);
  const customLogo = useLogoSrc(state.logoFile);
  // A saved logo is on another host; if it blocked the export, the retry goes without it.
  const logoSrc =
    !state.isLogoEnabled || (exportSafe && !(state.logoFile instanceof File))
      ? null
      : (customLogo ?? rateupIcon);
  const clear = state.qrBgColor === TRANSPARENT;
  const dirty = !isEqual(saved, state);
  const slug = fileName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "qr-code";

  const save = async () => {
    setSaving(true);
    if (await onSave?.(state)) setSaved(state);
    setSaving(false);
  };

  return (
    <div className="@container">
      <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className={cn("flex flex-col", flat ? "gap-6" : "gap-4")}>
          <StyleCard state={state} set={set} flat={flat} />
          <ColoursCard state={state} set={set} flat={flat} />
          <LogoCard state={state} set={set} flat={flat} customLogo={customLogo} />
        </div>

        <div className="-order-1 mx-auto flex w-full max-w-sm flex-col gap-3 @3xl:sticky @3xl:top-4 @3xl:order-none @3xl:max-w-none">
          <div className="flex justify-center rounded-xl bg-muted p-6 sm:p-8">
            <div
              className={cn(
                "w-full max-w-60 overflow-hidden rounded-md shadow-sm",
                clear && CHECKERBOARD,
              )}
            >
              <QrArtboard
                ref={boardRef}
                value={url}
                code={state.qrColor}
                background={state.qrBgColor}
                logoSrc={logoSrc}
                logoSize={state.logoSize}
                logoRadius={state.logoBorderRadius}
              />
            </div>
          </div>
          {onSave && (
            <Button disabled={!dirty} loading={saving} onClick={() => void save()}>
              <IconDeviceFloppy data-icon="inline-start" />
              {dirty ? t("Save design") : t("Design saved")}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              loading={exporting}
              disabled={disabled}
              onClick={() => download(`${slug}.png`)}
            >
              <IconDownload data-icon="inline-start" />
              {t("PNG")}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={disabled || exporting}
              onClick={() => print(PRINT_WIDTH_MM)}
            >
              <IconPrinter data-icon="inline-start" />
              {t("Print")}
            </Button>
            <CopyButton
              variant="outline"
              className="flex-1"
              value={url}
              label={t("Copy link")}
              toastMessage={t("Link copied")}
              disabled={disabled}
            />
          </div>
          {disabled && disabledReason && (
            <p className="text-center text-xs text-muted-foreground">{disabledReason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionProps {
  state: QrDesign;
  set: (patch: Partial<QrDesign>) => void;
  flat: boolean;
}

function Panel({
  flat,
  className,
  children,
}: Readonly<{ flat: boolean; className: string; children: ReactNode }>) {
  if (flat) return <div className={cn("flex flex-col", className)}>{children}</div>;
  return (
    <Card size="sm">
      <CardContent className={cn("flex flex-col", className)}>{children}</CardContent>
    </Card>
  );
}

/** A gallery rather than two pickers: most people want a known-good pair, not a colour theory lesson. */
function StyleCard({ state, set, flat }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  return (
    <Panel flat={flat} className="gap-3">
      <SectionHeading title={t("Style")} hint={t("Start from one, then adjust below.")} />
      <div
        role="radiogroup"
        aria-label={t("Style")}
        className="grid grid-cols-3 gap-2.5 @lg:grid-cols-6"
      >
        {qrPresets(t).map((preset) => {
          const selected =
            state.qrColor.toLowerCase() === preset.code &&
            state.qrBgColor.toLowerCase() === preset.background;
          const see = preset.background === TRANSPARENT;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set({ qrColor: preset.code, qrBgColor: preset.background })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "overflow-hidden rounded-[4px] ring-1 ring-foreground/10",
                  see && CHECKERBOARD,
                )}
              >
                <QrThumbnail
                  value="https://rateup.app"
                  color={preset.code}
                  background={see ? "none" : preset.background}
                  className="size-11"
                />
              </span>
              <span className="w-full truncate text-center text-xs font-medium">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function ColoursCard({ state, set, flat }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const clear = state.qrBgColor === TRANSPARENT;
  const warning = scanWarning(state.qrColor, state.qrBgColor, t);

  return (
    <Panel flat={flat} className="gap-4">
      <SectionHeading title={t("Colours")} />
      <ColorField
        id={`${uid}-code`}
        label={t("Code")}
        value={state.qrColor}
        onChange={(qrColor) => set({ qrColor })}
        swatches={["#000000", "#0f2540", "#1c518e", "#177f45", "#7c2d12", "#434a55"]}
      />
      {!clear && (
        <ColorField
          id={`${uid}-background`}
          label={t("Background")}
          value={state.qrBgColor}
          onChange={(qrBgColor) => set({ qrBgColor })}
          swatches={["#ffffff", "#fff7ed", "#f0f5fb", "#f3f4f6"]}
        />
      )}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">{t("Transparent background")}</span>
          <span className="block text-xs text-muted-foreground">
            {t("For placing the code on your own artwork.")}
          </span>
        </span>
        <Switch
          checked={clear}
          onCheckedChange={(on) => set({ qrBgColor: on ? TRANSPARENT : "#ffffff" })}
        />
      </label>
      {warning && (
        <Alert>
          <IconAlertTriangle />
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}
    </Panel>
  );
}

function LogoCard({
  state,
  set,
  flat,
  customLogo,
}: Readonly<SectionProps & { customLogo: string | null }>) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const shapeLabels = { square: t("Square"), rounded: t("Rounded"), circle: t("Circle") };

  return (
    <Panel flat={flat} className="gap-4">
      <SectionHeading
        title={t("Logo")}
        hint={t("Sits in the middle. The code still scans around it.")}
        actions={
          <Switch
            aria-label={t("Show a logo in the middle")}
            checked={!!state.isLogoEnabled}
            onCheckedChange={(isLogoEnabled) => set({ isLogoEnabled })}
          />
        }
      />
      {state.isLogoEnabled && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <img
              src={customLogo ?? rateupIcon}
              alt=""
              className="size-12 shrink-0 rounded-md bg-muted object-contain p-1 ring-1 ring-foreground/10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {customLogo ? t("Your logo") : t("RateUp logo")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("PNG, JPG or SVG. A square image works best.")}
              </p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) set({ logoFile: file });
              }}
            />
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <IconUpload data-icon="inline-start" />
                {customLogo ? t("Replace") : t("Upload yours")}
              </Button>
              {customLogo && (
                <Button variant="ghost" size="sm" onClick={() => set({ logoFile: null })}>
                  {t("Remove")}
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-4 @md:grid-cols-2">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel>{t("Size")}</FieldLabel>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round((state.logoSize / LOGO_SIZE_BASE) * 100)}%
                </span>
              </div>
              <Slider
                value={[state.logoSize]}
                min={50}
                max={90}
                aria-label={t("Logo size")}
                onValueChange={(v) => set({ logoSize: Array.isArray(v) ? v[0] : v })}
              />
            </Field>
            <Field>
              <FieldLabel>{t("Shape")}</FieldLabel>
              <div role="radiogroup" aria-label={t("Logo shape")} className="flex gap-2">
                {LOGO_SHAPES.map((shape) => {
                  const selected = state.logoBorderRadius === shape.radius;
                  return (
                    <button
                      key={shape.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={shapeLabels[shape.id]}
                      title={shapeLabels[shape.id]}
                      onClick={() => set({ logoBorderRadius: shape.radius })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span
                        className="size-4 bg-foreground/60"
                        style={{ borderRadius: `${shape.radius}%` }}
                      />
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </>
      )}
    </Panel>
  );
}
