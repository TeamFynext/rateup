import { IconAdjustments, IconChevronDown, IconRotate } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { cn } from "@/lib/utils.ts";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/utils/authz/permissions.ts";
import { ROLE_META, ROLE_PERMISSIONS, type RoleKey } from "@/utils/authz/roles.ts";

interface Props {
  roleKey: RoleKey;
  grants: readonly string[];
  denies: readonly string[];
  /** What the signed-in editor holds; nothing beyond it can be added. */
  editorPermissions: ReadonlySet<Permission>;
  disabled?: boolean;
  saving?: boolean;
  onSave: (next: { grants: Permission[]; denies: Permission[] }) => void;
}

/** The permissions the roles page never shows: recipients of alerts are picked elsewhere. */
const HIDDEN: ReadonlySet<Permission> = new Set(["notify.billing", "notify.integrations"]);

/**
 * Fine-tuning on top of a role. Every ability is a checkbox; the role's own abilities are
 * ticked by default and the editor's changes are stored only as the difference from the role,
 * so a later role change does not drag stale overrides along.
 */
export function PermissionOverridesEditor({
  roleKey,
  grants,
  denies,
  editorPermissions,
  disabled,
  saving,
  onSave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const base = ROLE_PERMISSIONS[roleKey];
  const [open, setOpen] = useState(grants.length > 0 || denies.length > 0);
  const [draftGrants, setDraftGrants] = useState<Set<Permission>>(new Set());
  const [draftDenies, setDraftDenies] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    setDraftGrants(
      new Set(
        grants.filter((p): p is Permission => !base.has(p as Permission) && p in PERMISSION_LABELS),
      ),
    );
    setDraftDenies(new Set(denies.filter((p): p is Permission => base.has(p as Permission))));
  }, [roleKey, grants, denies]);

  const effective = (p: Permission) => (base.has(p) ? !draftDenies.has(p) : draftGrants.has(p));
  const toggle = (p: Permission) => {
    if (base.has(p)) {
      setDraftDenies((prev) => {
        const next = new Set(prev);
        if (next.has(p)) next.delete(p);
        else next.add(p);
        return next;
      });
    } else {
      setDraftGrants((prev) => {
        const next = new Set(prev);
        if (next.has(p)) next.delete(p);
        else next.add(p);
        return next;
      });
    }
  };

  const savedCount = grants.length + denies.length;
  const draftCount = draftGrants.size + draftDenies.size;
  const dirty = useMemo(() => {
    const same = (a: ReadonlySet<string>, b: readonly string[]) =>
      a.size === b.length && b.every((p) => a.has(p));
    return !(
      same(
        draftGrants,
        grants.filter((p) => !base.has(p as Permission)),
      ) &&
      same(
        draftDenies,
        denies.filter((p) => base.has(p as Permission)),
      )
    );
  }, [draftGrants, draftDenies, grants, denies, base]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
          />
        }
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <IconAdjustments className="size-4 text-muted-foreground" aria-hidden="true" />
          {t("Fine-tune abilities")}
          {savedCount > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
              {t("{count} customised", { count: savedCount })}
            </Badge>
          )}
        </span>
        <IconChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 border-t px-3 py-3">
        <p className="text-xs text-muted-foreground">
          {t(
            "Ticked abilities come with the {role} role. Add one they lack or take one away; you can only add what you hold yourself.",
            {
              role: t(ROLE_META[roleKey].label),
            },
          )}
        </p>

        <div className="flex flex-col gap-3">
          {PERMISSION_GROUPS.map((group) => {
            const visible = group.permissions.filter((p) => !HIDDEN.has(p));
            if (visible.length === 0) return null;
            return (
              <fieldset key={group.key} className="flex flex-col gap-1.5">
                <legend className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(group.label)}
                </legend>
                {visible.map((p) => {
                  const fromRole = base.has(p);
                  const checked = effective(p);
                  const changed = fromRole ? draftDenies.has(p) : draftGrants.has(p);
                  const cannotAdd = !fromRole && !editorPermissions.has(p);
                  const id = `override-${p}`;
                  return (
                    <label
                      key={p}
                      htmlFor={id}
                      className={cn(
                        "flex items-center gap-2.5 text-sm",
                        (disabled || cannotAdd) && "opacity-70",
                      )}
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        disabled={disabled || cannotAdd}
                        onCheckedChange={() => toggle(p)}
                      />
                      <span className="min-w-0 flex-1 truncate">{t(PERMISSION_LABELS[p])}</span>
                      {changed && (
                        <span
                          className={cn(
                            "text-[11px]",
                            fromRole ? "text-destructive" : "text-primary",
                          )}
                        >
                          {fromRole ? t("Removed") : t("Added")}
                        </span>
                      )}
                      {!changed && fromRole && (
                        <span className="text-[11px] text-muted-foreground">{t("From role")}</span>
                      )}
                      {cannotAdd && !changed && (
                        <span className="text-[11px] text-muted-foreground">
                          {t("Not yours to give")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </fieldset>
            );
          })}
        </div>

        {!disabled && (
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={draftCount === 0 || saving}
              onClick={() => {
                setDraftGrants(new Set());
                setDraftDenies(new Set());
              }}
            >
              <IconRotate className="size-4" aria-hidden="true" />
              {t("Reset to role")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => onSave({ grants: [...draftGrants], denies: [...draftDenies] })}
            >
              {saving ? t("Saving") : t("Save abilities")}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
