import * as Haptics from "expo-haptics";

/**
 * Counter haptics.
 *
 * The one thing a phone can do that the web cashier cannot: confirm without being looked
 * at. Staff are watching the customer, not the screen, so the tap that lands the points is
 * felt rather than read.
 *
 * Every call is fire-and-forget and swallows its rejection — the simulator, a device with
 * haptics switched off in settings, and older Android hardware all reject, and none of that
 * should surface at the counter.
 */

/** A write landed: points given, a reward handed over, a customer enrolled. */
export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A write was refused — not enough points, a code already used, no connection. */
export function hapticWarning(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** A write failed outright. */
export function hapticError(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/** A choice was registered — picking a customer, a reward, a step. */
export function hapticSelect(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
