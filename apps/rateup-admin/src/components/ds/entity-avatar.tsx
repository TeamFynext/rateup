import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/** An org's logo or a user's photo, falling back to initials on the muted tile. */
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
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
