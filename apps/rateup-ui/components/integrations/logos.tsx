import { cn } from "@/lib/utils";

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
