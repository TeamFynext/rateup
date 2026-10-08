import { cssInterop } from "nativewind";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import type { ComponentProps } from "react";

cssInterop(KeyboardAvoidingView, { className: "style" });

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
 * `automaticOffset` measures where this view really is on screen, natively, so no offset
 * is guessed: the content's bottom edge lands `gap` above the keyboard on any device.
 */
export default function KeyboardAvoider({ bottomInset = 0, gap = 0, style, ...props }: Props) {
  return (
    <KeyboardAvoidingView
      behavior="padding"
      automaticOffset
      keyboardVerticalOffset={gap - bottomInset}
      style={[{ flex: 1 }, style]}
      {...props}
    />
  );
}
