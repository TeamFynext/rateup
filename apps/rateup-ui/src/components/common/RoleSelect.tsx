import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { ROLE_META, type RoleKey } from "@/utils/authz/roles.ts";

interface RoleSelectProps {
  value: RoleKey | "";
  onChange: (role: RoleKey) => void;
  /** The roles this user may hand out (see `usePermissions().grantableRoles`). */
  grantable: readonly RoleKey[];
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * The one role picker. It lists only roles the signed-in user may grant, so a manager never
 * sees Admin in the menu and the server's refusal stays a safety net rather than the UX.
 */
export function RoleSelect({
  value,
  onChange,
  grantable,
  id,
  disabled,
  className,
}: Readonly<RoleSelectProps>) {
  const { t } = useTranslation();
  const items = grantable.map((key) => ({ value: key, label: t(ROLE_META[key].label) }));

  return (
    <Select
      value={value || null}
      disabled={disabled}
      items={items}
      onValueChange={(next) => {
        if (next && grantable.includes(next as RoleKey)) onChange(next as RoleKey);
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={t("Choose a role")} />
      </SelectTrigger>
      {/* The shared item text is nowrap and the popup is pinned to the trigger's width, which
          clips a summary; this picker lets the menu grow and the summaries wrap. */}
      <SelectContent className="w-auto max-w-sm min-w-(--anchor-width)">
        {grantable.map((key) => (
          <SelectItem key={key} value={key} className="items-start py-2">
            <div className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
              <span className="font-medium">{t(ROLE_META[key].label)}</span>
              <span className="text-xs leading-snug text-muted-foreground">
                {t(ROLE_META[key].summary)}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
