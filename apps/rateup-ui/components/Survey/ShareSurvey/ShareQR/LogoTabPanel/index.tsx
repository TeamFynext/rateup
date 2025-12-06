"use client";

import { useRef, useState } from "react";

import { Check, Droplet, ImageIcon, Palette } from "lucide-react";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SliderCompatible from "@/components/ui/sliderCompatible";
import { Switch } from "@/components/ui/switch";

import CustomSwitch from "../../../SurveyTheme/components/stylescomponent/CustomSwitch";
import CustomColorPicker from "../../components/CustomColorPicker";
import { getLogoFileValueForFileInput } from "../utils";
import ChipGroup from "./ChipGroup";
import { logoFillTypes } from "./constants";
import fileInputStyles from "./FileInput.module.css";
import styles from "./LogoTabPanel.module.css";
import radioStyles from "./Radio.module.css";

// function LogoTabpanel({ state, dispatch }) {
//   const {
//     qrBgColor,
//     qrColor,
//     logoSize,
//     logoFillType,
//     logoBorderRadius,
//     logoFile,
//     isLogoEnabled = true,
//   } = state;
//   const translations = useTranslations();
//   return (
//     <Stack className={styles["panel-container"]}>
//       <Title order={3} className={styles["panel-heading"]}>
//         {translations("Logo Options")}
//       </Title>

//       <Flex className={styles["logo-tab-options-container"]}>
//         <Box>
//           <Stack className={styles["option-container"]}>
//             <Group>
//               <Title order={4} className={styles["option-heading"]}>
//                 {translations("Logo:")}
//               </Title>
//               <RateupSwitch
//                 offMessage={translations("Click here to enable the logo")}
//                 onMessage={translations("Click here to disable the logo")}
//                 checked={isLogoEnabled}
//                 onChange={(e) => {
//                   dispatch({
//                     type: "logo-image-switch",
//                     payload: e.target.checked,
//                   });
//                 }}
//               />
//             </Group>

//             {isLogoEnabled && (
// <FileInput
//   classNames={fileInputStyles}
//   placeholder={translations("Upload Logo")}
//   accept="image/png,image/jpeg,image/svg+xml"
//   onChange={(value) => {
//     dispatch({
//       type: "file-input",
//       payload: value,
//     });
//   }}
//   value={getLogoFileValueForFileInput(logoFile)}
// />
//             )}
//           </Stack>

//           <Stack className={styles["option-container"]}>
//             <Title order={4} className={styles["option-heading"]}>
//               {translations("Size")}
//             </Title>
//             <Slider
//               className={styles["slider"]}
//               value={logoSize}
//               onChange={(value) => {
//                 dispatch({
//                   type: "logo-size",
//                   payload: value,
//                 });
//               }}
//               label={(value) => value}
//               step={1}
//               defaultValue={70}
//               min={50}
//               max={100}
//             />
//           </Stack>

//           <Stack className={styles["option-container"]}>
//             <Title order={4} className={styles["option-heading"]}>
//               {translations("Fill Type")}
//             </Title>
//             <Group className={styles["fill-types-chip-container"]}>
// <ChipGroup
//   multiple={false}
//   chipsData={logoFillTypes}
//   value={logoFillType}
//   handleChange={(value) => {
//     dispatch({
//       type: "logo-fill-type",
//       payload: value,
//     });
//   }}
// />
//             </Group>
//           </Stack>
//           {/* </Stack> */}

//           {/* <Stack style={{ gap: "2rem" }}> */}
//           <Stack className={styles["option-container"]}>
//             <Title order={4} className={styles["option-heading"]}>
//               {translations("Border Radius")}
//             </Title>
//             <Slider
//               className={styles["slider"]}
//               value={logoBorderRadius}
//               onChange={(value) => {
//                 dispatch({
//                   type: "logo-border-radius",
//                   payload: value,
//                 });
//               }}
//               label={(value) => value}
//               step={1}
//               defaultValue={50}
//               min={0}
//               max={50}
//             />
//           </Stack>
//         </Box>

//         <Box>
//           <Stack className={styles["option-container"]}>
//             <Title order={4} className={styles["option-heading"]}>
//               {translations("Background Color")}
//             </Title>
//             <Radio.Group
// onChange={(value) => {
//   if (value === "transparent") {
//     dispatch({
//       type: "qr-bg-color",
//       payload: value,
//     });
//   } else {
//     dispatch({
//       type: "qr-bg-color",
//       payload: "#FFFFFF",
//     });
//   }
// }}
//               value={qrBgColor.startsWith("#") ? "color" : "transparent"}
//             >
//               <Stack>
//                 <Radio
//                   classNames={radioStyles}
//                   value="transparent"
//                   label={translations("Transparent")}
//                 />
//                 <Radio
//                   classNames={radioStyles}
//                   value="color"
//                   label={translations("Color")}
//                 />
//               </Stack>
//             </Radio.Group>
//             {qrBgColor.startsWith("#") && (
//               <CustomColorPicker
//                 value={qrBgColor}
// onChange={(value) => {
//   dispatch({
//     type: "qr-bg-color",
//     payload: value,
//   });
// }}
//               />
//             )}
//           </Stack>
//           <Stack className={styles["option-container"]}>
//             <Title order={4} className={styles["option-heading"]}>
//               {translations("Color")}
//             </Title>
//             <CustomColorPicker
//               value={qrColor}
//               onChange={(value) => {
//                 dispatch({
//                   type: "qr-color",
//                   payload: value,
//                 });
//               }}
//             />
//           </Stack>
//         </Box>
//       </Flex>
//     </Stack>
//   );
// }

function LogoTabpanel({ state, dispatch }) {
  const {
    qrBgColor,
    qrColor,
    logoSize,
    logoFillType,
    logoBorderRadius,
    logoFile,
    isLogoEnabled = true,
  } = state;

  const translations = useTranslations();
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
    <div className="rounded-lg p-2 flex flex-col gap-4 w-full max-w-xl">
      <div className="border flex flex-col p-2.5 rounded-lg gap-2">
        <div className="flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold">Logo Options</h3>
        </div>
        <div className="space-y-2">
          {/* Logo Toggle */}
          <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 border">
            <Label className="text-xs font-medium">Enable Logo</Label>
            <Switch
              checked={isLogoEnabled}
              onCheckedChange={(checked) =>
                dispatch({ type: "logo-image-switch", payload: checked })
              }
              className="data-[state=checked]:bg-primary scale-75"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only disabled:opacity-50"
                onChange={(ev) => {
                  const file = ev.target.files?.[0] ?? null;
                  dispatch({ type: "file-input", payload: file });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={!isLogoEnabled}
              />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center bg-primary h-7 rounded-lg text-[11px] shadow-md diabled:opacity-50"
                disabled={!isLogoEnabled}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                <span className="text-xs">
                  {logoFile instanceof File
                    ? logoFile.name
                    : getLogoFileValueForFileInput(logoFile) ||
                      translations("Upload Logo")}
                </span>
              </Button>
            </div>

            <div
              className={`grid grid-cols-2 gap-2 ${isLogoEnabled ? "opacity-100" : "opacity-50"}`}
            >
              {/* Size Slider */}
              <div className="rounded-lg p-1.5 border flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">Size</Label>
                  <span className="text-[11px] font-medium text-primary">
                    {displayLogoSize}%
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
                />
              </div>

              {/* Border Radius Slider */}
              <div className="rounded-lg p-1.5 border flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold">Radius</Label>
                  <span className="text-[11px] font-medium text-primary">
                    {displayLogoRadius}%
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
                />
              </div>
            </div>

            <div
              className={`flex items-center justify-center ${isLogoEnabled ? "opacity-100" : "opacity-50"}`}
            >
              <ChipGroup
                multiple={false}
                chipsData={logoFillTypes}
                value={logoFillType}
                handleChange={(value) => {
                  dispatch({
                    type: "logo-fill-type",
                    payload: value,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-lg p-2.5 border flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold">Background Color</h3>
        </div>

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
          <div className="flex gap-4">
            <div className="flex-1 flex gap-1 items-center rounded-lg px-2 py-1.5 border cursor-pointer hover:border-primary transition-colors">
              <RadioGroupItem
                value="transparent"
                id="transparent"
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary scale-75"
              />
              <Label
                htmlFor="transparent"
                className="text-xs cursor-pointer font-medium"
              >
                Transparent
              </Label>
            </div>
            <div className="flex-1 flex gap-1 items-center rounded-lg px-2 py-1.5 border cursor-pointer hover:border-primary transition-colors">
              <RadioGroupItem
                value="color"
                id="color"
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary scale-75"
              />
              <Label
                htmlFor="color"
                className="text-xs cursor-pointer font-medium"
              >
                Color
              </Label>
            </div>
          </div>
        </RadioGroup>

        <div className="flex gap-1.5">
          <div className="w-8 h-8 overflow-hidden">
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
              className="w-full h-full border-0 p-0 cursor-pointer disabled:opacity-50"
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
            className="flex-1 h-8 border text-center text-[10px] uppercase disabled:opacity-50"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Foreground Color */}
      <div className="rounded-lg p-2.5 border flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold">QR Code Color</h3>
        </div>

        <div className="flex gap-1.5">
          <div className="w-8 h-8 overflow-hidden">
            <Input
              type="color"
              value={qrColor}
              onChange={(e) => {
                dispatch({
                  type: "qr-color",
                  payload: e.target.value,
                });
              }}
              className="w-full h-full border-0 p-0 cursor-pointer rounded-lg"
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
            className="flex-1 h-8 border text-center text-[10px] uppercase"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}

export default LogoTabpanel;
