import { coercedString } from "@/utils/search.ts";

/**
 * The Customers page's URL state.
 *
 * `phone` is the opened member — the details view used to be local component state, so
 * nothing outside the page could point at a customer. The number is the key rather than
 * the account id because the panel behind the view looks a customer up by phone, and it
 * is what the cashier and the Activity ledger already carry.
 *
 * The router's default search parser JSON-parses values, so an all-digit phone arrives as
 * a number — hence the coercion, as on the cashier.
 */
export interface CustomersSearch {
  phone?: string;
}

export function validateCustomersSearch(search: Record<string, unknown>): CustomersSearch {
  return { phone: coercedString(search.phone) };
}
