import type { Prisma } from "../../../generated/prisma/client.js";
import { ContactGroupType } from "../../../generated/prisma/client.js";
import { WHATSAPP_CONTACT_CHANNEL, whatsappContactWhere } from "./contact.channel.js";
import type { PaginationQuery } from "./contact.schema.js";

/**
 * The contacts list query — search, `type` and the filter keys — as a where clause. Split out of
 * `getContactsByOrgId` so "add every matching contact" — to a group or to a campaign — selects
 * exactly the rows the list showed, not a re-implementation that drifts from it. Kept free of
 * `contact.service` so the campaign module can use it without that file's import graph.
 */
export function buildContactListWhere(
  orgId: string,
  query?: PaginationQuery,
): Prisma.ContactWhereInput {
  const {
    page: _page,
    limit: _limit,
    search = "",
    sort: _sort,
    desc: _desc,
    ...filter
  } = query ?? {};
  let filterData: Prisma.ContactWhereInput[] = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for (const [key, value] of params.entries()) {
      switch (key) {
        case "name":
        case "phone":
        case "email": {
          filterData.push({
            [key]: {
              contains: value,
              mode: "insensitive" as const,
            },
          });
          break;
        }
        case "createdAt": {
          const day = new Date(value);
          if (!Number.isNaN(day.getTime())) {
            const nextDay = new Date(day);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            filterData.push({ createdAt: { gte: day, lt: nextDay } });
          }
          break;
        }
        case "consent": {
          filterData.push({
            [key]: {
              equals: value?.toLocaleLowerCase() === "true",
            },
          });
          break;
        }

        case "filterGroupName": {
          let splitValue = [...new Set(value?.split(","))];
          filterData.push({
            contactGroups: {
              some: {
                contactGroupId: {
                  in: splitValue,
                },
              },
            },
          });
          break;
        }
        case "source": {
          // `source` is a free-form column whose writers disagree on casing
          // ("whatsapp" vs "WEBCHAT" vs "CSV IMPORT"), so match it case-insensitively.
          if (value !== "all") {
            filterData.push({
              source: { equals: value, mode: "insensitive" as const },
            });
          }
          break;
        }
        case "channel": {
          // Unlike `source`, this asks where the contact is actually reachable — see
          // contact.channel.ts. Only WhatsApp is selectable today; anything else is ignored.
          if (value === WHATSAPP_CONTACT_CHANNEL) {
            filterData.push(whatsappContactWhere);
          }
          break;
        }
        case "lifecycleId": {
          if (value !== "all") {
            filterData.push({
              [key]: value,
            });
          }
          break;
        }
        case "stageId": {
          // The pipeline counterpart of `lifecycleId`. A contact has no stage of
          // its own — the stage belongs to its lead — so this asks whether the
          // contact has a lead sitting in that column.
          if (value !== "all") {
            filterData.push({
              leads: { some: { stageId: value } },
            });
          }
          break;
        }
        case "labelId": {
          if (!["all", "active", "blocked"].includes(value)) {
            filterData.push({
              ContactLabelMap: {
                some: {
                  labelId: value,
                },
              },
            });
          }
          if (value === "active") {
            filterData.push({
              blockedOnWhatsApp: false,
            });
          } else if (value === "blocked") {
            filterData.push({
              blockedOnWhatsApp: true,
            });
          }
          break;
        }
        case "labelIds": {
          // Comma-joined; a contact matches when it carries any of them.
          const labelIds = [...new Set(value.split(",").filter(Boolean))];
          if (labelIds.length > 0) {
            filterData.push({ ContactLabelMap: { some: { labelId: { in: labelIds } } } });
          }
          break;
        }
        case "customFieldId": {
          // Paired with `customFieldValue`. Values are stored as strings whatever the
          // field's type, so an exact, case-insensitive match serves text, number,
          // email and list fields alike. Without a value it means "has this field set".
          const fieldValue = params.get("customFieldValue")?.trim();
          filterData.push({
            customFields: {
              some: {
                fieldId: value,
                ...(fieldValue
                  ? { value: { equals: fieldValue, mode: "insensitive" as const } }
                  : { value: { not: "" } }),
              },
            },
          });
          break;
        }
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (query?.type === ContactGroupType.LOYALTY) {
    // Contact -> CustomerLoyaltyAccount is a list relation (`loyaltyAccounts`);
    // "is a loyalty member" is therefore `some`, not `isNot: null`.
    filterData.push({ loyaltyAccounts: { some: {} } });
  }

  return filterData.length > 0 ? { orgId, AND: filterData } : { orgId };
}
