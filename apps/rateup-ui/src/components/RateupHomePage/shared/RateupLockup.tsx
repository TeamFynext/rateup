import { rateupLogo, rateupLogoWhite } from "@/utils/constants";

/**
 * The RateUp lockup, cropped to the mark.
 *
 * Both bucket PNGs are 2500×992 but the lockup only covers x 289–2214, y 298–759; the rest is
 * transparent. The frame takes the lockup's own ratio and the image is scaled and offset to
 * fill it, so `className` sizes what is visible. Re-measure if either asset is replaced.
 */
export default function RateupLockup({
  onDark = false,
  eager = false,
  className = "",
}: Readonly<{ onDark?: boolean; eager?: boolean; className?: string }>) {
  return (
    <span className={`relative block aspect-[1926/462] flex-none overflow-hidden ${className}`}>
      <img
        src={onDark ? rateupLogoWhite : rateupLogo}
        alt="RateUp"
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        className="absolute top-[-64.5%] left-[-15%] h-auto w-[129.8%] max-w-none"
      />
    </span>
  );
}
