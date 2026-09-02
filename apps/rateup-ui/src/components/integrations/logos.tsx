import { cn } from "@/lib/utils.ts";
import { imagesPath, metaLockup, metaLockupWhite, rateupIcon } from "@/utils/constants";

type LogoProps = Readonly<{ className?: string }>;

export function ShopifyLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/shopifyicon.png`}
      alt="Shopify"
      className={cn("object-contain", className)}
    />
  );
}

export function GoogleSheetsLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/googlesheeticon.png`}
      alt="Google Sheets"
      className={cn("object-contain", className)}
    />
  );
}

export function AmeliaLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/amelia.png`}
      alt="Amelia"
      className={cn("object-contain", className)}
    />
  );
}

export function WhatsAppPaymentLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/whatsapp.png`}
      alt="WhatsApp Payment"
      className={cn("object-contain", className)}
    />
  );
}

export function PetpoojaLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/petpooja.png`}
      alt="Petpooja"
      className={cn("object-contain", className)}
    />
  );
}

export function ZapierLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/zapier.png`}
      alt="Zapier"
      className={cn("object-contain", className)}
    />
  );
}

export function ZohoLogo({ className }: LogoProps) {
  return (
    <img src={`${imagesPath}/zoho.jpg`} alt="Zoho" className={cn("object-contain", className)} />
  );
}

export function RateupStar({ className }: LogoProps) {
  return (
    <img src={rateupIcon} alt="" aria-hidden="true" className={cn("object-contain", className)} />
  );
}

export function BiginLogo({ className }: LogoProps) {
  return (
    <img src={`${imagesPath}/bigin.png`} alt="Bigin" className={cn("object-contain", className)} />
  );
}

export function ZohoCombinedLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn("relative h-16 w-20", className)}>
      <div className="absolute left-0 top-1 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background shadow-sm">
        <ZohoLogo className="h-7 w-7" />
      </div>

      <div className="absolute left-8 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-background shadow-sm">
        <BiginLogo className="h-7 w-7" />
      </div>
    </div>
  );
}

/**
 * Meta's company lockup, used as-is from their brand pack.
 *
 * `onDark` picks the mono-white cut: the colour lockup's wordmark is #1c2b33 and vanishes
 * against the navy footer. The mark is decorative wherever a "Business Partner" label sits
 * beside it — the label already names Meta — so it takes an empty alt and is hidden from
 * assistive tech rather than read out twice.
 */
export function MetaLockup({ className, onDark }: LogoProps & Readonly<{ onDark?: boolean }>) {
  return (
    <img
      src={onDark ? metaLockupWhite : metaLockup}
      alt=""
      aria-hidden="true"
      className={cn("w-auto object-contain", className)}
    />
  );
}
