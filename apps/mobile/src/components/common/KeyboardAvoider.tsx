import { cssInterop } from "nativewind";
import {
  KeyboardAvoidingView,
  KeyboardControllerNative,
  KeyboardEvents,
} from "react-native-keyboard-controller";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, findNodeHandle } from "react-native";
import type { ComponentProps } from "react";
import type { LayoutChangeEvent, ViewInstance } from "react-native";

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
 * bottom edge lands `gap` above the keyboard on any device.
 *
 * The library's own `automaticOffset` is not used for that: it measures once, at first
 * layout, when a screen being pushed may not be in the window yet. A view that starts
 * below the status bar (everything under the protected layout's top safe area) is then
 * taken to start at 0 and stays short of the keyboard by that inset, hiding the composer:
 * every time on iOS, now and then on Android. Here the position is measured at layout
 * and again each time the keyboard opens, by when the screen has long settled.
 */
export default function KeyboardAvoider({
  bottomInset = 0,
  gap = 0,
  style,
  onLayout,
  ...props
}: Props) {
  const ref = useRef<ViewInstance>(null);
  const parentY = useRef(0);
  // How far below its parent-relative `y` the view really sits in the window.
  const [windowOffset, setWindowOffset] = useState(0);

  const measure = useCallback(() => {
    const view = ref.current;
    if (!view) return;

    const apply = (y: number) => {
      if (Number.isFinite(y)) setWindowOffset(y - parentY.current);
    };

    if (IS_IOS) {
      // From the laid-out tree, so right even before the screen is attached.
      view.measureInWindow((_x, y) => apply(y));
      return;
    }

    // React Native's `measureInWindow` is unreliable on edge-to-edge Android, so this is
    // the same native call `automaticOffset` makes.
    const tag = findNodeHandle(view);
    if (tag == null) return;
    KeyboardControllerNative.viewPositionInWindow(tag)
      .then((position) => apply(position.y))
      .catch(() => {});
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout?.(e);
      parentY.current = e.nativeEvent.layout.y;
      measure();
    },
    [onLayout, measure],
  );

  useEffect(() => {
    const subscription = KeyboardEvents.addListener("keyboardWillShow", measure);
    return () => subscription.remove();
  }, [measure]);

  return (
    <KeyboardAvoidingView
      // keyboard-controller still types its ref with the pre-0.88 `View` type; at runtime
      // it is the same host view, so the cast only bridges the type definitions.
      ref={ref as unknown as ComponentProps<typeof KeyboardAvoidingView>["ref"]}
      behavior="padding"
      keyboardVerticalOffset={gap - bottomInset + windowOffset}
      style={[{ flex: 1 }, style]}
      onLayout={handleLayout}
      {...props}
    />
  );
}
