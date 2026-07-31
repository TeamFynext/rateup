import { Slider } from "./slider.tsx";

// If your Slider wrapper uses a different prop name for change, adjust below.

interface Props {
  value?: number | number[];
  defaultValue?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  // callbacks
  onChange?: (value: number | number[]) => void; // Mantine-style
  onValueChange?: (value: number[]) => void; // Radix-style
  // pass-through any other props
  [key: string]: any;
}

export default function SliderCompatible({
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  className,
  onChange,
  onValueChange,
  ...rest
}: Props) {
  // Ensure we always pass an array to the real Slider
  const normalizeToArray = (v: unknown, fallback: number) => {
    if (Array.isArray(v)) return v as number[];
    if (v == null) return [fallback];
    const n = Number(v);
    return Number.isFinite(n) ? [n] : [fallback];
  };

  // prefer controlled `value` when provided, else defaultValue fallback

  const arrayValue = normalizeToArray(value ?? defaultValue, min);

  // Handler invoked by Radix/shadcn Slider which gives number[].
  // Map it to onChange (Mantine) as number or to onValueChange as array.
  const handleValueChange = (next: number | readonly number[]) => {
    // Defensive: ensure numbers
    const safeArr = (Array.isArray(next) ? next : [next]).map((x) => Number(x));
    try {
      if (typeof onValueChange === "function") onValueChange(safeArr);
      if (typeof onChange === "function") {
        // If original `value` was a number, call with number; else call with array
        if (!Array.isArray(value) && value !== undefined) {
          onChange(safeArr[0]);
        } else {
          onChange(safeArr);
        }
      }
    } catch (err) {
      // keep UX flowing even if handler throws

      console.error("SliderCompatible callback error:", err);
    }
  };

  return (
    <Slider
      // The shadcn / Radix wrapper usually expects `value` and `onValueChange`.
      // But in case your Slider uses different prop names (e.g. onChange),
      // this still usually works because many wrappers forward props.
      value={arrayValue}
      onValueChange={handleValueChange}
      min={min}
      max={max}
      step={step}
      className={className}
      {...rest}
    />
  );
}
