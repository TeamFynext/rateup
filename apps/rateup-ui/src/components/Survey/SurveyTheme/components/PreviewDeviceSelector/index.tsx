import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { cn } from "@/lib/utils.ts";

import { PreviewTypeEnum } from "../../SurveyTheme.enums";

function PreviewDeviceSelector({ onChange, value, withLabel = true, className = "" }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {withLabel && <p className="text-xl">Preview:</p>}
      <ToggleGroup spacing={0} variant="outline">
        <ToggleGroupItem
          pressed={value === PreviewTypeEnum.DESKTOP}
          onPressedChange={() => onChange(PreviewTypeEnum.DESKTOP)}
          className="aria-pressed:bg-primary aria-pressed:text-white"
        >
          <IconDeviceDesktop size={"1.25rem"} />
        </ToggleGroupItem>
        <ToggleGroupItem
          pressed={value === PreviewTypeEnum.MOBILE}
          onPressedChange={() => onChange(PreviewTypeEnum.MOBILE)}
          className="aria-pressed:bg-primary aria-pressed:text-white"
        >
          <IconDeviceMobile size={"1.25rem"} />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export default PreviewDeviceSelector;
