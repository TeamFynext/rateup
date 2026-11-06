import type { ComponentType } from "react";

import { RateupStar } from "@/components/integrations/logos";
import { cn } from "@/lib/utils";

/**
 * The service mark and RateUp's, joined by a rule that carries the connection state: solid
 * when the two are wired, a dashed gap when they are not. Every integration page and card
 * opens with one, which is what makes eleven differently-built pages read as one set.
 *
 * `own` marks a RateUp service (API, Widget, Webhook). Those get the brand tint and no
 * second tile — there is nothing to pair them with.
 */
export function IntegrationPlate({
  icon: Icon,
  connected = false,
  own = false,
  size = "md",
  className,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  connected?: boolean;
  own?: boolean;
  size?: "sm" | "md";
  className?: string;
}>) {
  const tile = size === "sm" ? "size-8" : "size-10";
  const glyph = size === "sm" ? "size-4.5" : "size-6";

  // A partner mark arrives as a PNG or a JPEG with a baked-in white box, at whatever
  // intrinsic size the vendor shipped. Fixing the tile and using object-contain is what
  // stops a 512px logo and a squat JPEG rendering at two different apparent sizes.
  const markTile = cn(
    "flex shrink-0 items-center justify-center rounded-lg ring-1 ring-border",
    own ? "bg-primary/10 text-primary" : "bg-card",
    tile,
  );

  if (own) {
    return (
      <div className={cn(markTile, className)}>
        <Icon className={glyph} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className={markTile}>
        <Icon className={cn(glyph, "object-contain")} />
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-3 shrink-0",
          connected ? "bg-border" : "border-t border-dashed border-border",
        )}
      />
      <div className={cn(markTile, "bg-muted")}>
        <RateupStar className={glyph} />
      </div>
    </div>
  );
}
