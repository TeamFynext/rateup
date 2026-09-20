import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { cn } from "@/lib/utils";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

/** A team member's avatar, matching the people list in Settings → Users. */
export function StaffAvatar({
  name,
  photo,
  className,
}: Readonly<{ name?: string; photo?: string | null; className?: string }>) {
  return (
    <Avatar className={cn("size-9 shrink-0", className)}>
      <AvatarImage src={getFileUrlFromKey(photo ?? "")} />
      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
        {name?.toUpperCase().slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
}
