import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PopoverEmojiPicker } from "@/components/whatsapp/templates/Details/TextFormateToolBar.tsx";
import { SmileyResponse } from "@/types/enums.ts";

import { getSmileyIcon } from "../../TakeSurvey/TakeSurveyComponent/SmileyRating/index.tsx";
import type { QuestionExtraPropsForm } from "./questionForm.ts";

export enum SmileyVariantStyle {
  Default = "Default",
  Filled = "Filled",
  FilledOnHover = "FilledOnHover",
  Emojis = "Emojis",
  Custom = "Custom",
}

export enum SmileyColorType {
  Default = "Default",
  Individual = "Individual",
  Gradient = "Gradient",
}

function ColorInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      {label && <FieldTitle className="text-xs text-muted-foreground">{label}</FieldTitle>}
      <div
        className="flex h-9 w-36 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 hover:bg-accent"
        onClick={() => inputRef.current?.click()}
        title={placeholder ?? "Choose a color"}
      >
        <span
          className="size-5 shrink-0 rounded-sm border border-black/10 shadow-sm"
          style={{ backgroundColor: value ?? "#000000" }}
        />
        <input
          ref={inputRef}
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <span className="flex-1 font-mono text-xs text-muted-foreground">
          {value?.toUpperCase() ?? "#000000"}
        </span>
      </div>
    </div>
  );
}

const SmileyExtraProps = ({ form }: { form: QuestionExtraPropsForm }) => {
  const uid = useId();
  const features = form.values.features ? { ...form.values.features } : {};
  const [opened, setOpened] = useState(true);

  const handleChange = (field: string, value: unknown) => {
    const updateData: Record<string, any> = { [field]: value };
    if (
      field === "colorType" &&
      value === SmileyColorType.Gradient &&
      (!features?.iconStyle?.gradientStartColor || !features?.iconStyle?.gradientEndColor)
    ) {
      updateData["gradientStartColor"] = "#ff0000";
      updateData["gradientEndColor"] = "#00ff00";
    }
    if (
      field === "colorType" &&
      value === SmileyColorType.Individual &&
      !features?.iconStyle?.color
    ) {
      updateData["color"] = {
        1: "#ff0000",
        2: "#ffa500",
        3: "#ffff00",
        4: "#00ff00",
        5: "#008000",
      };
    }
    if (field !== "variant" && !features?.iconStyle?.variant) {
      updateData["variant"] = SmileyVariantStyle.Default;
    }
    form.setFieldValue("features", {
      ...features,
      iconStyle: { ...features?.iconStyle, ...updateData },
    });

    if (value !== "Default" && !opened) setOpened(true);
  };

  const updateSmileyColor = (smiley: number, value: string) => {
    form.setFieldValue("features", {
      ...features,
      iconStyle: {
        ...features?.iconStyle,
        color: { ...features?.iconStyle?.color, [smiley]: value },
      },
    });
  };

  const updateSmileyEmoji = (smiley: number, value: string) => {
    form.setFieldValue("features", {
      ...features,
      iconStyle: {
        ...features?.iconStyle,
        emojies: { ...features?.iconStyle?.emojies, [smiley]: value },
      },
    });
  };

  const isColorDisabled =
    !features?.iconStyle?.variant ||
    [SmileyVariantStyle.Custom, SmileyVariantStyle.Emojis, SmileyVariantStyle.Default].includes(
      features?.iconStyle?.variant,
    );

  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-sm font-semibold">Emoji Style</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-4">
          <Field>
            <FieldLabel htmlFor={`${uid}-variant`} className="text-xs text-muted-foreground">
              Variant
            </FieldLabel>
            <Select
              value={features?.iconStyle?.variant ?? SmileyVariantStyle.Default}
              onValueChange={(v) => handleChange("variant", v)}
            >
              <SelectTrigger id={`${uid}-variant`} size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SmileyVariantStyle).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor={`${uid}-color`} className="text-xs text-muted-foreground">
              Color
            </FieldLabel>
            <Select
              value={features?.iconStyle?.colorType ?? SmileyColorType.Default}
              onValueChange={(v) => handleChange("colorType", v)}
              disabled={isColorDisabled}
            >
              <SelectTrigger id={`${uid}-color`} size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SmileyColorType).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpened((o) => !o)}
        >
          {opened ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
        </Button>
      </div>

      {opened && (
        <div>
          {features?.iconStyle?.variant === SmileyVariantStyle.Custom ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Click on each smiley to insert corresponding emoji
              </p>
              {Object.values(SmileyResponse)
                .reverse()
                .map((smiley, i) => (
                  <div key={smiley} className="flex items-center gap-2">
                    <span className="w-24 text-sm font-semibold">{smiley}</span>
                    <span>:</span>
                    <PopoverEmojiPicker
                      showIcon={
                        features?.iconStyle?.emojies?.[i + 1] ? (
                          <span className="text-base">{features?.iconStyle?.emojies?.[i + 1]}</span>
                        ) : null
                      }
                      onEmojiClick={(emoji) => updateSmileyEmoji(i + 1, emoji)}
                    />
                  </div>
                ))}
            </div>
          ) : features?.iconStyle?.colorType === SmileyColorType.Individual ? (
            <div className="flex flex-col gap-2">
              {Object.values(SmileyResponse)
                .reverse()
                .map((smiley, i) => (
                  <div key={smiley} className="flex items-center gap-2">
                    {getSmileyIcon(smiley)}
                    <span>:</span>
                    <ColorInput
                      placeholder="Choose a color"
                      onChange={(value) => updateSmileyColor(i + 1, value)}
                      value={features?.iconStyle?.color?.[i + 1]}
                    />
                  </div>
                ))}
            </div>
          ) : features?.iconStyle?.colorType === SmileyColorType.Gradient ? (
            <div className="flex gap-4">
              <ColorInput
                label="Start Color"
                onChange={(value) => handleChange("gradientStartColor", value)}
                value={features?.iconStyle?.gradientStartColor}
              />
              <ColorInput
                label="End Color"
                onChange={(value) => handleChange("gradientEndColor", value)}
                value={features?.iconStyle?.gradientEndColor}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

function hexToRgb(hex: string) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function generateGradient(
  startColor: string,
  endColor: string,
  steps: number,
  defaultColor: string,
) {
  if (!startColor || !endColor) {
    return Array.from({ length: steps }, () => defaultColor);
  }
  const startRGB = hexToRgb(startColor);
  const endRGB = hexToRgb(endColor);
  const stepFactor = 1 / (steps + 1);
  const gradientColors = [startColor];

  for (let i = 1; i <= steps; i++) {
    const r = Math.round(startRGB[0] + stepFactor * i * (endRGB[0] - startRGB[0]));
    const g = Math.round(startRGB[1] + stepFactor * i * (endRGB[1] - startRGB[1]));
    const b = Math.round(startRGB[2] + stepFactor * i * (endRGB[2] - startRGB[2]));
    gradientColors.push(rgbToHex(r, g, b));
  }

  gradientColors.push(endColor);
  return gradientColors;
}

export default SmileyExtraProps;
