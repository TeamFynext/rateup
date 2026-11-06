import type { KeyboardEvent } from "react";

/**
 * `onKeyDown` for a field that saves on Enter and takes a new line on
 * Shift+Enter. An Enter that confirms an IME composition (Japanese, Chinese,
 * Korean input) is left alone, or picking a word would save a half-typed note.
 */
export function submitOnEnter(submit: () => void) {
  return (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };
}
