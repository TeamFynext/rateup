import { rateupLockup, rateupLockupWhite, rateupLockupWhiteLarge } from "@/utils/constants";

/**
 * The RateUp lockup. `className` sizes the visible mark; the files are cropped to it.
 * `large` swaps in the 1600px white file for display sizes (the footer) — only on dark.
 */
export default function RateupLockup({
  onDark = false,
  eager = false,
  large = false,
  className = "",
}: Readonly<{ onDark?: boolean; eager?: boolean; large?: boolean; className?: string }>) {
  const whiteSrc = large ? rateupLockupWhiteLarge : rateupLockupWhite;
  return (
    <span className={`relative block aspect-[1926/462] flex-none ${className}`}>
      <img
        src={onDark ? whiteSrc : rateupLockup}
        alt="RateUp"
        width={large ? 1600 : 480}
        height={large ? 384 : 115}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        className="absolute inset-0 size-full"
      />
    </span>
  );
}
