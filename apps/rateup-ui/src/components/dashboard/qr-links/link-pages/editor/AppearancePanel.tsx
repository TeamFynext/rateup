import { IconAlertTriangle } from "@tabler/icons-react";
import { isEqual } from "lodash";
import type { Dispatch, ReactNode } from "react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { LinktreeTheme } from "@/backend/linktree/linktree.api.ts";
import { ColorField } from "@/components/common/color-field.tsx";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

import {
  contrast,
  matchesPreset,
  type ThemeAction,
  type ThemePreset,
  themePresets,
} from "../theme.ts";
import { ImagePicker } from "./ImagePicker.tsx";
import { useSaveTheme } from "./useSaveTheme.ts";

const TEXT_SWATCHES = ["#111827", "#ffffff", "#0f2540", "#7c2d12", "#064e3b", "#831843"];
const BUTTON_SWATCHES = ["#0a000d", "#ffffff", "#1c518e", "#f8951d", "#177f45", "#be185d"];
const PAGE_SWATCHES = ["#f7f7f7", "#ffffff", "#111827", "#0f2540", "#fff7ed", "#ecfdf5"];

const TITLE_SIZES = [24, 30, 40] as const;
const SUBTITLE_SIZES = [14, 16, 20] as const;
const BUTTON_SHAPES = [
  { id: "square", radius: 4 },
  { id: "rounded", radius: 14 },
  { id: "pill", radius: 40 },
] as const;

/** Below this, button or page text stops being comfortable to read. */
const MIN_CONTRAST = 3;

interface AppearancePanelProps {
  shortUrlId: string;
  saved: LinktreeTheme;
  theme: LinktreeTheme;
  dispatch: Dispatch<ThemeAction>;
}

/** Edits the theme draft that the phone preview beside it renders. Nothing is live until Save. */
export function AppearancePanel({
  shortUrlId,
  saved,
  theme,
  dispatch,
}: Readonly<AppearancePanelProps>) {
  const { t } = useTranslation();
  const { save, saving } = useSaveTheme(shortUrlId, dispatch);
  const dirty = !isEqual(saved, theme);

  return (
    <div className="flex flex-col gap-4">
      <ThemeCard theme={theme} dispatch={dispatch} />
      <HeaderCard theme={theme} dispatch={dispatch} />
      <ButtonsCard theme={theme} dispatch={dispatch} />
      <BackgroundCard theme={theme} dispatch={dispatch} />

      <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-lg border bg-background/95 p-3 backdrop-blur">
        <span className="mr-auto text-sm text-muted-foreground">
          {dirty ? t("Unsaved changes") : t("All changes saved")}
        </span>
        <Button
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => dispatch({ type: "replace", theme: saved })}
        >
          {t("Discard")}
        </Button>
        <Button disabled={!dirty} loading={saving} onClick={() => void save(theme)}>
          {t("Save")}
        </Button>
      </div>
    </div>
  );
}

interface SectionProps {
  theme: LinktreeTheme;
  dispatch: Dispatch<ThemeAction>;
}

function Section({
  title,
  hint,
  children,
}: Readonly<{ title: string; hint?: string; children: ReactNode }>) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <SectionHeading title={title} hint={hint} />
        {children}
      </CardContent>
    </Card>
  );
}

/** A choice in a row of options, drawn the way the QR designer draws its own. */
function choiceClass(selected: boolean) {
  return cn(
    "rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
  );
}

function ThemeCard({ theme, dispatch }: Readonly<SectionProps>) {
  const { t } = useTranslation();

  return (
    <Section title={t("Theme")} hint={t("Sets the colours in one go. Adjust any of them below.")}>
      <div
        role="radiogroup"
        aria-label={t("Theme")}
        className="grid grid-cols-3 gap-2.5 sm:grid-cols-6"
      >
        {themePresets(t).map((preset) => {
          const selected = matchesPreset(theme, preset);
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: "preset", preset })}
              className={cn("flex flex-col items-center gap-1.5 p-2", choiceClass(selected))}
            >
              <PresetThumb
                preset={preset}
                radius={Number(theme.linkListItem.styles.borderRadius ?? 14)}
              />
              <span className="w-full truncate text-center text-xs font-medium">
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/** A tiny page: logo dot, title and subtitle bars, two buttons, in the preset's colours. */
function PresetThumb({ preset, radius }: Readonly<{ preset: ThemePreset; radius: number }>) {
  const button = { backgroundColor: preset.button, borderRadius: Math.min(radius, 40) / 5 };
  const ink = { backgroundColor: preset.text };
  return (
    <span
      aria-hidden
      className="flex h-16 w-full flex-col items-center gap-1 overflow-hidden rounded-[5px] px-2 pt-2 ring-1 ring-foreground/10"
      style={{ backgroundColor: preset.page }}
    >
      <span className="size-2 rounded-full opacity-40" style={ink} />
      <span className="h-1 w-8 rounded-[1px]" style={ink} />
      <span className="h-[3px] w-6 rounded-[1px] opacity-60" style={ink} />
      <span className="mt-0.5 h-2 w-full" style={button} />
      <span className="h-2 w-full" style={button} />
    </span>
  );
}

function HeaderCard({ theme, dispatch }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const { title, subtitle, logo, background } = theme;
  const textColor = String(title.styles.color ?? "#111827");
  const page = String(background.styles.backgroundColor ?? "#ffffff");
  const sizeLabels = [t("Small"), t("Medium"), t("Large")];
  const logoWidth = Number(logo.styles.width ?? 50);

  return (
    <Section title={t("Header")}>
      <div className="flex flex-col gap-3">
        <ImagePicker
          label={t("Logo")}
          shape="logo"
          value={logo.logoUrl ?? null}
          onChange={(image) => dispatch({ type: "logo-image", image })}
        />
        {logo.logoUrl && (
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>{t("Logo size")}</FieldLabel>
              <span className="text-xs text-muted-foreground tabular-nums">{logoWidth}px</span>
            </div>
            <Slider
              value={[logoWidth]}
              min={30}
              max={150}
              aria-label={t("Logo size")}
              onValueChange={(v) =>
                dispatch({ type: "logo-scale", width: Array.isArray(v) ? v[0] : v })
              }
            />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <Field>
          <FieldLabel htmlFor={`${uid}-title`}>{t("Title")}</FieldLabel>
          <Input
            id={`${uid}-title`}
            value={title.text}
            onChange={(e) => dispatch({ type: "text", part: "title", value: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <SizeChoice
            label={t("Title size")}
            sizes={TITLE_SIZES}
            labels={sizeLabels}
            value={Number(title.styles.fontSize ?? 30)}
            onChange={(value) =>
              dispatch({ type: "text-size", part: "title", key: "fontSize", value })
            }
          />
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            {t("Bold")}
            <Switch
              checked={Number(title.styles.fontWeight ?? 500) >= 600}
              onCheckedChange={(bold) =>
                dispatch({
                  type: "text-size",
                  part: "title",
                  key: "fontWeight",
                  value: bold ? 700 : 500,
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <Field>
          <FieldLabel htmlFor={`${uid}-subtitle`}>{t("Subtitle")}</FieldLabel>
          <Textarea
            id={`${uid}-subtitle`}
            rows={2}
            value={subtitle.text}
            placeholder={t("One line on what the buttons are for.")}
            onChange={(e) => dispatch({ type: "text", part: "subtitle", value: e.target.value })}
          />
        </Field>
        <SizeChoice
          label={t("Subtitle size")}
          sizes={SUBTITLE_SIZES}
          labels={sizeLabels}
          value={Number(subtitle.styles.fontSize ?? 16)}
          onChange={(value) =>
            dispatch({ type: "text-size", part: "subtitle", key: "fontSize", value })
          }
        />
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <ColorField
          id={`${uid}-text`}
          label={t("Text colour")}
          value={textColor}
          swatches={TEXT_SWATCHES}
          onChange={(value) => {
            dispatch({ type: "text-color", part: "title", value });
            dispatch({ type: "text-color", part: "subtitle", value });
          }}
        />
        {!background.mobileBgImgUrl && contrast(textColor, page) < MIN_CONTRAST && (
          <ContrastWarning>{t("The text is hard to read on this page colour.")}</ContrastWarning>
        )}
      </div>
    </Section>
  );
}

function SizeChoice({
  label,
  sizes,
  labels,
  value,
  onChange,
}: Readonly<{
  label: string;
  sizes: readonly number[];
  labels: string[];
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {sizes.map((size, index) => (
        <button
          key={size}
          type="button"
          role="radio"
          aria-checked={value === size}
          onClick={() => onChange(size)}
          className={cn("px-3 py-1 text-xs font-medium", choiceClass(value === size))}
        >
          {labels[index]}
        </button>
      ))}
    </div>
  );
}

function ButtonsCard({ theme, dispatch }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const { styles } = theme.linkListItem;
  const fill = String(styles.backgroundColor ?? "#0a000d");
  const ink = String(styles.color ?? "#ffffff");
  const radius = Number(styles.borderRadius ?? 14);
  const shapeLabels = { square: t("Square"), rounded: t("Rounded"), pill: t("Pill") };

  return (
    <Section title={t("Buttons")}>
      <div role="radiogroup" aria-label={t("Button shape")} className="grid grid-cols-3 gap-2.5">
        {BUTTON_SHAPES.map((shape) => {
          const selected = radius === shape.radius;
          return (
            <button
              key={shape.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => dispatch({ type: "button-radius", value: shape.radius })}
              className={cn("flex flex-col items-center gap-2 p-3", choiceClass(selected))}
            >
              <span
                aria-hidden
                className="flex h-7 w-full items-center justify-center text-[10px] font-medium"
                // Scaled to the 28px sample from the page's ~48px button, so the shapes still differ.
                style={{ backgroundColor: fill, color: ink, borderRadius: shape.radius * 0.6 }}
              >
                {t("Link")}
              </span>
              <span className="text-xs font-medium">{shapeLabels[shape.id]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-4">
        <ColorField
          id={`${uid}-fill`}
          label={t("Button colour")}
          value={fill}
          swatches={BUTTON_SWATCHES}
          onChange={(value) => dispatch({ type: "button-color", key: "backgroundColor", value })}
        />
        <ColorField
          id={`${uid}-ink`}
          label={t("Button text")}
          value={ink}
          swatches={["#ffffff", "#111827", "#0f2540"]}
          onChange={(value) => dispatch({ type: "button-color", key: "color", value })}
        />
      </div>
      {contrast(fill, ink) < MIN_CONTRAST && (
        <ContrastWarning>
          {t("The button text is hard to read on this button colour.")}
        </ContrastWarning>
      )}
    </Section>
  );
}

function BackgroundCard({ theme, dispatch }: Readonly<SectionProps>) {
  const { t } = useTranslation();
  const uid = useId();
  const { background } = theme;

  return (
    <Section
      title={t("Background")}
      hint={t("A photo covers the colour. Phones and computers can use different ones.")}
    >
      <ColorField
        id={`${uid}-page`}
        label={t("Page colour")}
        value={String(background.styles.backgroundColor ?? "")}
        swatches={PAGE_SWATCHES}
        onChange={(value) => dispatch({ type: "background-color", value })}
      />
      <div className="flex flex-col gap-3 border-t pt-4">
        <ImagePicker
          label={t("Photo on phones")}
          shape="mobile"
          value={background.mobileBgImgUrl}
          onChange={(image) => dispatch({ type: "background-image", device: "mobile", image })}
        />
        <ImagePicker
          label={t("Photo on computers")}
          shape="desktop"
          value={background.desktopBgImgUrl}
          onChange={(image) => dispatch({ type: "background-image", device: "desktop", image })}
        />
      </div>
    </Section>
  );
}

function ContrastWarning({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Alert>
      <IconAlertTriangle />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
