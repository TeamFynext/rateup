import { IconColorPicker } from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

enum Size {
  md = "md",
  lg = "lg",
}

function useEyeDropper() {
  const supported = typeof window !== "undefined" && "EyeDropper" in window;
  const open = () => new (window as any).EyeDropper().open();
  return { supported, open };
}

interface CustomColorPickerProps {
  /** Id applied to the colour input, so a `FieldLabel htmlFor` can target it. */
  id?: string;
  className?: string;
  value: string;
  onChange: any;
  size?: string;
  elementToBeDisplayed?: React.ReactNode;
  withoutEyedropper?: boolean;
}

function CustomColorPicker({
  id,
  className = "",
  value,
  onChange,
  size = "md",
  elementToBeDisplayed,
  withoutEyedropper,
}: CustomColorPickerProps) {
  const { supported: isEyeDroppersupported, open } = useEyeDropper();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = useCallback(
    (_e) => {
      setIsFocused(false);
      if (!value?.length) {
        handleInputChange("#000000");
      }
    },
    [value],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleInputChange = useCallback(
    (eventOrvalue) => {
      let resultValue = eventOrvalue;
      if (typeof eventOrvalue === "object") {
        resultValue = eventOrvalue.target.value;
      }
      if (!resultValue.length) {
        resultValue = "#000000";
      }
      onChange(resultValue);
    },
    [onChange],
  );

  const pickEyeDropperColor = async () => {
    try {
      const { sRGBHex } = await open();
      handleInputChange(sRGBHex);
    } catch {}
  };
  const { t: translations } = useTranslation();

  const colorInput = (
    <input
      id={id}
      ref={colorInputRef}
      type="color"
      value={!value?.length ? "#000000" : value}
      onChange={handleInputChange}
      className={cn(
        "shrink-0 cursor-pointer rounded-[0.875rem] border-2 border-[#868e96] p-[3px]",
        size === Size.md ? "h-9 w-10" : "h-[50px] w-[60px]",
        elementToBeDisplayed && "sr-only",
      )}
    />
  );

  if (elementToBeDisplayed) {
    return (
      <div
        className="custom-element-from-props cursor-pointer"
        onClick={() => colorInputRef.current?.click()}
      >
        {elementToBeDisplayed}
        {colorInput}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "custom-color-picker-container flex gap-2.5",
        size === Size.md && "w-full",
        className,
      )}
    >
      {colorInput}

      <input
        type="text"
        className={cn(
          "flex-none rounded-2xl border-2 border-[#868e96] text-center uppercase outline-none",
          size === Size.md ? "h-9 flex-1 p-2.5 text-sm" : "px-3.5 py-2.5 text-base",
          isFocused && "border-primary",
        )}
        size={7}
        maxLength={7}
        value={!value?.length ? "#000000" : value}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onChange={handleInputChange}
      />

      {!isEyeDroppersupported || withoutEyedropper ? null : (
        <Button
          className={cn(
            "h-auto rounded-2xl",
            size === Size.md && "h-9 p-2.5 text-xs [&_svg]:size-[1.125rem]",
          )}
          onClick={pickEyeDropperColor}
        >
          <IconColorPicker data-icon="inline-start" />
          {translations("Eye Dropper")}
        </Button>
      )}
    </div>
  );
}

export default CustomColorPicker;
