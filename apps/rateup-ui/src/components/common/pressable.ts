import type { KeyboardEvent } from "react";

/**
 * Makes a non-interactive element behave like a button for a keyboard and a screen reader.
 *
 * Only for elements that genuinely cannot be a `<button>` — a card whose own children are
 * interactive, or a wrapper whose layout a button would break. Anything else should be a
 * `<Button>`, and anything that goes to a URL should be an `<a>`, which browsers already
 * make focusable, activatable and openable in a new tab.
 *
 * Space is prevented because a focused element with `role="button"` otherwise scrolls the
 * page as well as firing.
 */
export function pressable(onPress: () => void, label?: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": label,
    onClick: onPress,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "") return;
      event.preventDefault();
      onPress();
    },
  };
}
