/**
 * "+91 98••• 41207": enough for staff to confirm they have the right person, not enough for
 * the customer behind them to read the whole number off the screen.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  const country = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : "";
  const local = digits.slice(-10);
  return `${country}${local.slice(0, 2)}••• ${local.slice(-5)}`;
}
