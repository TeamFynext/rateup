import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";

import CustomColorPicker from "../../../../../../../Survey/ShareSurvey/components/CustomColorPicker/index.tsx";
import { useThemeDispatch, useThemeObj } from "../../../../ThemeContext/ThemeContext.tsx";

function LinklistItemEditor() {
  const {
    linkListItem: {
      styles: { color, backgroundColor, borderRadius },
    },
  } = useThemeObj();
  const themeDispatch = useThemeDispatch();

  const handleColorChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "linkListItem-color-change",
      payload: value,
    });
  }, []);

  const handleBackgroundColorChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "linkListItem-background-color-change",
      payload: value,
    });
  }, []);

  const handleBorderRadiusChange = useCallback((value: string | number) => {
    themeDispatch({
      type: "linkListItem-border-radius-change",
      payload: value,
    });
  }, []);

  return (
    <div>
      <div className={`style-section-div`}>
        <h2>Text Color</h2>
        <CustomColorPicker value={String(color ?? "")} onChange={handleColorChange} />
      </div>

      <div className={`style-section-div`}>
        <h2>Background Color</h2>
        <CustomColorPicker
          value={String(backgroundColor ?? "")}
          onChange={handleBackgroundColorChange}
        />
      </div>

      <div className={`style-section-div`}>
        <h2>Border Radius</h2>
        <Slider
          value={[Number(borderRadius ?? 0)]}
          onValueChange={(value) =>
            handleBorderRadiusChange(Array.isArray(value) ? value[0] : value)
          }
          step={1}
          min={0}
          max={100}
        />
      </div>
    </div>
  );
}

export default LinklistItemEditor;
