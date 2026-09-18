import { cn } from "@/lib/utils.ts";
import { imagesPath, metaLockup, metaLockupWhite, rateupIcon } from "@/utils/constants";

/**
 * `priority` marks a logo that is genuinely above the fold. Everything else defaults to
 * `loading="lazy"` — React 19 emits a `<link rel="preload" as="image">` for every eager `<img>`
 * it renders during SSR, and the homepage was shipping 21 of them (14 client logos in a
 * below-fold marquee, both footer marks, a modal's icon), which is enough to push the real LCP
 * image out of the browser's priority queue.
 */
type LogoProps = Readonly<{ className?: string; priority?: boolean }>;

const loadingFor = (priority?: boolean) => (priority ? ("eager" as const) : ("lazy" as const));

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

export function GetLeadLogo({ className }: LogoProps) {
  return (
    <img
      src={`${imagesPath}/getleadconnect_logo.jpg`}
      alt="GetLead CRM"
      className={cn("object-contain", className)}
    />
  );
}

export function RateupStar({ className, priority }: LogoProps) {
  return (
    <img
      src={rateupIcon}
      alt=""
      aria-hidden="true"
      loading={loadingFor(priority)}
      decoding="async"
      className={cn("object-contain", className)}
    />
  );
}

export function BiginLogo({ className }: LogoProps) {
  return (
    <img src={`${imagesPath}/bigin.png`} alt="Bigin" className={cn("object-contain", className)} />
  );
}

/**
 * Meta's lockup files carry their clear space inside the canvas: the mark covers x 1000–5962,
 * y 1000–2000 of a 6962×3000 viewBox. The frame takes the mark's own ratio and the image is
 * scaled and offset to fill it, so `className` sizes the visible mark, not the padded canvas.
 */
export function MetaLockup({
  className,
  onDark,
  priority,
}: LogoProps & Readonly<{ onDark?: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block aspect-[4962/1000] flex-none overflow-hidden",
        className,
      )}
    >
      <img
        src={onDark ? metaLockupWhite : metaLockup}
        alt=""
        loading={loadingFor(priority)}
        decoding="async"
        className="absolute top-[-100%] left-[-20.15%] h-[300%] w-auto max-w-none"
      />
    </span>
  );
}
