import { Image as ExpoImage, ImageProps as ExpoImageProps } from "expo-image";
import { cssInterop } from "nativewind";

/**
 * expo-image, wired up for NativeWind.
 *
 * NativeWind only registers React Native's own components for `className`
 * (see react-native-css-interop/runtime/components). Without this
 * registration, `className` on an expo-image element is silently dropped and
 * the element renders unstyled.
 *
 * Prefer this over React Native's `Image` everywhere. expo-image downsamples
 * to the view size, caps its own memory cache, and releases bitmaps when the
 * view goes off-screen, which is what Play's bitmap memory metric measures.
 * React Native's Image decodes remote images at full source resolution.
 *
 * API note when migrating: expo-image has no `resizeMode`. Use `contentFit`
 * ("cover" | "contain" | "fill" | "none" | "scale-down"). A `resizeMode` key
 * inside `style` is ignored.
 */
cssInterop(ExpoImage, { className: "style" });

export type ImageProps = ExpoImageProps;

export default ExpoImage;
