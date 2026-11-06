import { cn } from "@/lib/utils";

import { swatches } from "../../SurveyTheme.constants";

interface CustomColorPickerProps {
  /** Id applied to the colour input, so a `FieldLabel htmlFor` can target it. */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  enableSwatches?: boolean;
}
export default function CustomColorPicker({
  id,
  onChange,
  value,
  enableSwatches = true,
}: CustomColorPickerProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <input
          id={id}
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-xl border-2 border-input p-[3px]"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={9}
          className="h-9 flex-1 rounded-2xl border-2 border-input px-2.5 text-center text-sm uppercase outline-none focus:border-ring"
        />
      </div>
      {enableSwatches && (
        <div className="flex flex-wrap gap-1.5">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => onChange(swatch)}
              className={cn(
                "size-6 rounded-full border-2 transition-transform hover:scale-110",
                value === swatch ? "border-ring" : "border-transparent",
              )}
              style={{ backgroundColor: swatch }}
              aria-label={swatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
