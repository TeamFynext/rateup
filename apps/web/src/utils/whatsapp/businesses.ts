/**
 * WhatsApp numbers belong to a Meta business portfolio, and an org can connect numbers
 * from several. These group any list of numbers under the business that owns each.
 */

export interface BusinessRef {
  id?: string | null;
  name?: string | null;
}

export interface BusinessGroup<T> {
  /** Null for numbers whose business has not been read from Meta yet. */
  id: string | null;
  name: string | null;
  items: T[];
}

/**
 * The items grouped by business, in the order each business first appears, with the
 * numbers whose business is not known yet last.
 */
export function groupByBusiness<T>(
  items: readonly T[],
  businessOf: (item: T) => BusinessRef | null | undefined,
): BusinessGroup<T>[] {
  const groups = new Map<string, BusinessGroup<T>>();
  let unknown: BusinessGroup<T> | undefined;
  for (const item of items) {
    const business = businessOf(item);
    const key = business?.id || business?.name;
    if (!key) {
      unknown ??= { id: null, name: null, items: [] };
      unknown.items.push(item);
      continue;
    }
    let group = groups.get(key);
    if (!group) {
      group = { id: business?.id ?? null, name: business?.name ?? null, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return unknown ? [...groups.values(), unknown] : [...groups.values()];
}

/** Grouping only earns its space once the numbers span more than one business. */
export const spansSeveralBusinesses = (groups: readonly BusinessGroup<unknown>[]) =>
  groups.length > 1;
