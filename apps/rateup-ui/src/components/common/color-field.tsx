import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { HEX_COLOR, readableTextOn } from "@/utils/color.ts";

/**
 * Colours that sit well with the RateUp chrome: the blue ramp, the two star ambers, two
 * WhatsApp greens and a neutral. Any hex can still be typed or picked.
 */
export const COLOR_SWATCHES: readonly string[] = [
  "#1c518e",
  "#2e68a8",
  "#5a8cc6",
  "#0f2540",
  "#f8951d",
  "#db7a0b",
  "#1fa85b",
  "#177f45",
  "#434a55",
];

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  onBlur?: () => void;
  hint?: string;
  /** Swatches only — for a spot like the VIP card, where a hex input is one field too many. */
  compact?: boolean;
  swatches?: readonly string[];
  invalid?: boolean;
  error?: { message?: string };
}

/**
 * Swatch row, native picker and a hex box, all writing the same six-digit value. Shared by the
 * loyalty wizard's brand colour and the team colour in settings.
 */
export function ColorField({
  id,
  label,
  value,
  onChange,
  onBlur,
  hint,
  compact = false,
  swatches = COLOR_SWATCHES,
  invalid,
  error,
}: Readonly<ColorFieldProps>) {
  const { t } = useTranslation();
  const current = value.toLowerCase();
  const valid = HEX_COLOR.test(current);

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
          {swatches.map((hex) => {
            const selected = hex === current;
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={hex}
                onClick={() => onChange(hex)}
                // The swatch IS the colour, so the hex can only be a style value.
                style={{ backgroundColor: hex, color: readableTextOn(hex) }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                  selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                )}
              >
                {selected && <IconCheck size={14} />}
              </button>
            );
          })}
        </div>

        <label
          className="relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border"
          title={t("Pick any colour")}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#f8951d,#1fa85b,#1c518e,#f8951d)] opacity-80"
          />
          <input
            type="color"
            aria-label={t("Pick any colour")}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            value={valid ? current : "#1c518e"}
            onChange={(event) => onChange(event.target.value.toLowerCase())}
          />
        </label>

        {!compact && (
          <Input
            id={id}
            className="h-8 w-28 font-mono text-xs uppercase"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            aria-invalid={invalid}
            spellCheck={false}
            maxLength={7}
          />
        )}
      </div>
      {hint && <FieldDescription className="text-xs">{hint}</FieldDescription>}
      {invalid && error && <FieldError errors={[error]} />}
    </Field>
  );
}
