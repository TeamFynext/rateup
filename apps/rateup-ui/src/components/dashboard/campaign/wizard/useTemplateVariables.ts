import { useMemo } from "react";

import { useCustomFieldsContext } from "@/context/CustomFieldsContext.tsx";

/**
 * The template shape the picker works with.
 *
 * Structural rather than `WaTemplateListEntry`, so the review summary can pass a
 * template it resolved a different way without either side importing the other's
 * exact row type.
 */
interface TemplateLike {
  data?: {
    components?: { type?: string; text?: string }[];
  };
}

export interface TemplateVariables {
  /** `["{{1}}", "{{2}}"]`, in the order they appear in the BODY. */
  placeholders: string[];
  /** What each placeholder can be mapped to: the contact's name, or a custom field. */
  options: { value: string; label: string }[];
}

/**
 * The `{{n}}` placeholders in a template's body, and what they can be filled from.
 *
 * Lifted out of `CreateCampaignModal`'s second tab, where the same derivation was
 * spread across three `useMemo`s and an effect. Both the wizard's Template step
 * and the review summary read it, and they have to agree.
 */
export function useTemplateVariables(template: TemplateLike | null | undefined): TemplateVariables {
  const { customFields } = useCustomFieldsContext();

  const placeholders = useMemo(() => {
    const body = template?.data?.components?.find((c) => c.type === "BODY")?.text ?? "";
    // De-duplicated: a template that uses {{1}} twice still maps one variable.
    return Array.from(new Set(body.match(/{{\d+}}/g) ?? []));
  }, [template]);

  const options = useMemo(
    () => [
      { value: "name", label: "Contact name" },
      ...(customFields ?? []).map((field) => ({
        value: field.slug,
        label: field.name ?? field.slug,
      })),
    ],
    [customFields],
  );

  return { placeholders, options };
}
