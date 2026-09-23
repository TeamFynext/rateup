import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/initials";
import { cn, isOwnImage } from "@/lib/utils";

/**
 * Initials on the muted tile. An org's logo or a user's photo is shown only when it is
 * served from the console itself; outside images are blocked by the CSP by design.
 */
export function EntityAvatar({
  name,
  src,
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-10", className)}>
      {isOwnImage(src) && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
