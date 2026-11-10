import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { ContactIdentity } from "@/backend/campaign/contacts/merge.api";
import { identityLabel, KIND_ICON } from "@/components/Contacts/merge/identity";

/** Which identity names a contact in the table: a reachable number first, then a handle. */
const MAIN_ORDER: ContactIdentity["kind"][] = [
  "PHONE",
  "WA_BSUID",
  "IG_SCOPED",
  "FB_PSID",
  "WEBCHAT",
  "EMAIL",
];

type Row = Partial<Pick<ContactsData, "identities" | "phone" | "source" | "other">>;

/**
 * The contact's main identity and the others it is known by. The list API sends every
 * identity primaries first, so the first of a kind is that kind's primary.
 */
export function contactHandles(row: Row) {
  const identities: ContactIdentity[] = row.identities ?? [];
  for (const kind of MAIN_ORDER) {
    const main = identities.find((identity) => identity.kind === kind);
    if (main) return { main, others: identities.filter((identity) => identity !== main) };
  }
  return { main: null, others: identities.filter((identity) => identity.kind !== "EXTERNAL") };
}

/**
 * How the table names one identity: as the Identities panel does, except that an Instagram
 * or Messenger id with no username or name yet shows the id itself, not a generic label.
 */
function tableLabel(identity: ContactIdentity, t: TFunction): string {
  const unnamed = !identity.username && !identity.displayName;
  if (unnamed && (identity.kind === "IG_SCOPED" || identity.kind === "FB_PSID")) {
    return identity.value;
  }
  return identityLabel(identity, t);
}

/** Plain text for the column: what the cell shows first. Also what CSV exports and sorting read. */
export function contactHandleText(row: Row, t: TFunction): string {
  const { main } = contactHandles(row);
  if (main) return tableLabel(main, t);
  // A row from before the API sent identities.
  return row.phone || (row.source === "WEBCHAT" ? row.other : "") || "";
}

export function ContactHandleCell({ row }: Readonly<{ row: Row }>) {
  const { t } = useTranslation();
  const { main, others } = contactHandles(row);
  const text = contactHandleText(row, t);
  const shown = others.filter((identity) => identity.kind !== "EXTERNAL");
  if (!text && shown.length === 0) return <span className="text-muted-foreground">-</span>;

  // One icon per kind, in a stable order, however many of that kind there are.
  const kinds = MAIN_ORDER.filter((kind) => shown.some((identity) => identity.kind === kind));

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate" title={main ? main.value : undefined}>
        {text || "-"}
      </span>
      {kinds.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className="flex shrink-0 items-center gap-1 text-muted-foreground"
                aria-label={t("Also known by {list}", {
                  list: shown.map((identity) => tableLabel(identity, t)).join(", "),
                })}
              />
            }
          >
            {kinds.map((kind) => {
              const Icon = KIND_ICON[kind];
              return <Icon key={kind} className="size-3.5" aria-hidden />;
            })}
          </TooltipTrigger>
          <TooltipContent>
            <ul className="space-y-0.5">
              {shown.map((identity) => (
                <li key={`${identity.kind}:${identity.value}`}>{tableLabel(identity, t)}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
