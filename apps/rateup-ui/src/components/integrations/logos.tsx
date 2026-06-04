import { cn } from "@/lib/utils.ts";

type LogoProps = Readonly<{ className?: string }>;

export function ShopifyLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/shopifyicon.png"
      alt="Shopify"
      className={cn("object-contain", className)}
    />
  );
}

export function GoogleSheetsLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/googlesheeticon.png"
      alt="Google Sheets"
      className={cn("object-contain", className)}
    />
  );
}

export function AmeliaLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/amelia.png"
      alt="Amelia"
      className={cn("object-contain", className)}
    />
  );
}

export function WhatsAppPaymentLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/whatsapp.png"
      alt="WhatsApp Payment"
      className={cn("object-contain", className)}
    />
  );
}

export function PetpoojaLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/petpooja.png"
      alt="Petpooja"
      className={cn("object-contain", className)}
    />
  );
}

export function ZapierLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/zapier.png"
      alt="Zapier"
      className={cn("object-contain", className)}
    />
  );
}

export function ZohoLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/zoho.jpg"
      alt="Zoho"
      className={cn("object-contain", className)}
    />
  );
}

export function RateupStar({ className }: LogoProps) {
  return (
    <img
      src="/images/rateup-star.svg"
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
}

export function BiginLogo({ className }: LogoProps) {
  return (
    <img
      src="/images/bigin.png"
      alt="Bigin"
      className={cn("object-contain", className)}
    />
  );
}

export function ZohoCombinedLogo({
  className,
}: Readonly<{ className?: string }>) {
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
