import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import SliderCompatible from "@/components/ui/sliderCompatible.tsx";
import { Switch } from "@/components/ui/switch.tsx";

function LogoTabpanel({ state, dispatch }) {
  const { qrBgColor, qrColor, logoSize, logoBorderRadius, isLogoEnabled } = state;

  const { t: translations } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ensureArray = (v: unknown, fallback: number) => {
    if (Array.isArray(v)) return v as number[];
    if (v == null) return [fallback];
    const n = Number(v as any);
    return Number.isFinite(n) ? [n] : [fallback];
  };

  const normalizedLogoSize = ensureArray(logoSize, 70);
  const normalizedLogoRadius = ensureArray(logoBorderRadius, 0);

  const displayLogoSize = normalizedLogoSize[0];
  const displayLogoRadius = normalizedLogoRadius[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Logo Upload Section */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium dark:text-gray-200">
          Logo (Optional)
          <Switch
            checked={isLogoEnabled}
            onCheckedChange={(checked) => dispatch({ type: "logo-image-switch", payload: checked })}
          />
        </Label>
        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors bg-gray-50 dark:bg-[#1a1a1a] dark:border-gray-600 dark:hover:border-primary">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            onChange={(ev) => {
              const file = ev.target.files?.[0] ?? null;
              dispatch({ type: "file-input", payload: file });
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2"
          >
            <svg
              className="w-10 h-10 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-sm text-gray-600 dark:text-gray-400">Drop or upload logo</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">SVG, PNG (max 300×300px)</div>
          </button>
        </div>
      </div>
      {/* Logo Size Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium dark:text-gray-200">Logo Size</Label>
          <span className="text-sm font-medium text-primary dark:text-blue-400">
            {displayLogoSize}px
          </span>
        </div>
        <SliderCompatible
          value={logoSize}
          onChange={(v) => {
            const newVal = Array.isArray(v) ? v[0] : v;
            dispatch({ type: "logo-size", payload: Number(newVal) });
          }}
          min={50}
          max={100}
          step={1}
          className="[&_.slider-track]:bg-red-500 [&_.slider-range]:bg-red-500 [&_.slider-thumb]:bg-red-500 [&_.slider-thumb]:border-red-500"
        />
      </div>
      {/* Logo Border Radius Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium dark:text-gray-200">Logo Border Radius</Label>
          <span className="text-sm font-medium text-primary dark:text-blue-400">
            {displayLogoRadius}px
          </span>
        </div>
        <SliderCompatible
          value={logoBorderRadius}
          onChange={(v) => {
            const newVal = Array.isArray(v) ? v[0] : v;
            dispatch({
              type: "logo-border-radius",
              payload: Number(newVal),
            });
          }}
          min={0}
          max={50}
          step={1}
          className="[&_.slider-track]:bg-red-500 [&_.slider-range]:bg-red-500 [&_.slider-thumb]:bg-red-500 [&_.slider-thumb]:border-red-500"
        />
      </div>
      {/* Background Section */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium dark:text-gray-200">Background</Label>
        <RadioGroup
          value={qrBgColor.startsWith("#") ? "color" : "transparent"}
          onValueChange={(value) => {
            if (value === "transparent") {
              dispatch({
                type: "qr-bg-color",
                payload: value,
              });
            } else {
              dispatch({
                type: "qr-bg-color",
                payload: "#FFFFFF",
              });
            }
          }}
        >
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2 items-center rounded-lg px-3 py-2 border dark:border-gray-700 cursor-pointer hover:border-primary dark:hover:border-primary transition-colors">
              <RadioGroupItem
                value="transparent"
                id="transparent"
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="transparent"
                className="text-sm cursor-pointer font-normal dark:text-gray-300"
              >
                {translations("Transparent")}
              </Label>
            </div>
            <div className="flex-1 flex gap-2 items-center rounded-lg px-3 py-2 border dark:border-gray-700 cursor-pointer hover:border-primary dark:hover:border-primary transition-colors">
              <RadioGroupItem
                value="color"
                id="color"
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="color"
                className="text-sm cursor-pointer font-normal dark:text-gray-300"
              >
                {translations("Custom Color")}
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="flex gap-2">
          <div className="w-10 h-10 rounded border dark:border-gray-700 overflow-hidden">
            <Input
              type="color"
              disabled={qrBgColor === "transparent"}
              value={qrBgColor}
              onChange={(e) => {
                dispatch({
                  type: "qr-bg-color",
                  payload: e.target.value,
                });
              }}
              className="w-full h-full border-0 p-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <Input
            value={qrBgColor}
            disabled={qrBgColor === "transparent"}
            onChange={(e) => {
              dispatch({
                type: "qr-bg-color",
                payload: e.target.value,
              });
            }}
            className="flex-1 h-10 text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#1a1a1a] dark:border-gray-700 dark:text-white"
            placeholder="#FFFFFF"
          />
        </div>
      </div>
      {/* QR Code Color Section */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium dark:text-gray-200">QR Code Color</Label>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded border dark:border-gray-700 overflow-hidden">
            <Input
              type="color"
              value={qrColor}
              onChange={(e) => {
                dispatch({
                  type: "qr-color",
                  payload: e.target.value,
                });
              }}
              className="w-full h-full border-0 p-0 cursor-pointer"
            />
          </div>
          <Input
            value={qrColor}
            onChange={(e) => {
              dispatch({
                type: "qr-color",
                payload: e.target.value,
              });
            }}
            className="flex-1 h-10 text-sm uppercase dark:bg-[#1a1a1a] dark:border-gray-700 dark:text-white"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}

export default LogoTabpanel;
