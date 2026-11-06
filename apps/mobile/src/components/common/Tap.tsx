import React, { useState } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

/**
 * A Pressable that takes a plain style plus a `pressedStyle` laid over it while held.
 *
 * Use this instead of `style={({ pressed }) => ...}`: NativeWind wraps Pressable, and
 * on the More sheet that function form came through with its layout dropped (rows drew
 * as columns, widths ignored). A plain object style always reaches the view.
 */
export default function Tap({
  style,
  pressedStyle,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Readonly<
  Omit<PressableProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    pressedStyle?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
  }
>) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={pressed && pressedStyle ? [style, pressedStyle] : style}
    >
      {children}
    </Pressable>
  );
}
