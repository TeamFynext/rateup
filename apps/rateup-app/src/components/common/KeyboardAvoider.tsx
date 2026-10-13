import { cssInterop } from "nativewind";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ComponentProps } from "react";
import type { LayoutChangeEvent, View } from "react-native";

cssInterop(KeyboardAvoidingView, { className: "style" });

const IS_IOS = Platform.OS === "ios";

type Props = Omit<
  ComponentProps<typeof KeyboardAvoidingView>,
  "behavior" | "automaticOffset" | "keyboardVerticalOffset"
> & {
  /**
   * Safe-area padding at the bottom of the content (under a chat composer, say) that the
   * keyboard may cover: it exists to clear the home indicator or navigation bar, which
   * the keyboard hides anyway. Without this the input floats that far above the keyboard,
   * 0 to 48dp depending on the phone.
   */
  bottomInset?: number;
  /** Space between the content and the top of the keyboard. */
  gap?: number;
  className?: string;
};

/**
 * The app's one way to keep content clear of the keyboard, on every screen.
 *
 * The app runs under react-native-keyboard-controller's `KeyboardProvider`, which takes
 * the keyboard over on Android: the window no longer resizes, so React Native's own
 * `KeyboardAvoidingView` (and `behavior={undefined}` on Android) does nothing there. And
 * offsets written as numbers (`20`, `80`, `100`) stood in for the status bar, header or
 * notch height, which differs on every phone.
 *
 * So the view's real position on screen is measured instead of guessed, and the content's
 * bottom edge lands `gap` above the keyboard on any device. Android uses the library's
 * `automaticOffset` for that. iOS cannot: it reads the native view's frame at first
 * layout, when a screen being pushed is not in the window yet, so a view that starts
 * below the status bar (everything under the protected layout's top safe area) is taken
 * to start at 0 and stays short of the keyboard by that inset, hiding the composer.
 * There the position comes from the laid-out tree, which is right from the first layout.
 */
export default function KeyboardAvoider({
  bottomInset = 0,
  gap = 0,
  style,
  onLayout,
  ...props
}: Props) {
  const ref = useRef<View>(null);
  // iOS only: how far below its parent-relative `y` the view really sits in the window.
  const [windowOffset, setWindowOffset] = useState(0);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout?.(e);
      if (!IS_IOS) return;

      const parentY = e.nativeEvent.layout.y;
      ref.current?.measureInWindow((_x, y) => {
        if (Number.isFinite(y)) setWindowOffset(y - parentY);
      });
    },
    [onLayout],
  );

  return (
    <KeyboardAvoidingView
      ref={ref}
      behavior="padding"
      automaticOffset={!IS_IOS}
      keyboardVerticalOffset={gap - bottomInset + windowOffset}
      style={[{ flex: 1 }, style]}
      onLayout={handleLayout}
      {...props}
    />
  );
}
