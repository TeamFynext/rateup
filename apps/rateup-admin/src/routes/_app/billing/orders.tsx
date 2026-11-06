import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { orderListQueryOptions, type Gateway, type OrderStatus } from "@/api/billing.api";
import { orderColumns } from "@/components/billing/order-columns";
import { FilterChips, type FilterChip } from "@/components/ds/filter-chips";
import { PageHeading } from "@/components/ds/page-heading";
import { Pager } from "@/components/ds/pager";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ds/query-states";
import { ResponsiveTable } from "@/components/ds/responsive-table";
import { SearchField } from "@/components/ds/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/format";

const PAGE_SIZE = 25;
const STATUSES = ["all", "COMPLETE", "PENDING", "FAILED"] as const;
const GATEWAYS = ["all", "razorpay", "stripe", "shopify"] as const;
const STATUS_CHIPS: FilterChip<(typeof STATUSES)[number]>[] = [
  { value: "all", label: "All" },
  { value: "COMPLETE", label: "Complete" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];
const GATEWAY_LABELS: Record<(typeof GATEWAYS)[number], string> = {
  all: "All gateways",
  razorpay: "Razorpay",
  stripe: "Stripe",
  shopify: "Shopify",
};

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  status: z.enum(STATUSES).optional().catch(undefined),
  gateway: z.enum(GATEWAYS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});
type OrderSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/billing/orders")({
  validateSearch: searchSchema,
  component: OrdersPage,
});

const COLUMNS = orderColumns({ withOrg: true });

function OrdersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const list = useQuery(
    orderListQueryOptions({
      q: search.q || undefined,
      status: search.status && search.status !== "all" ? (search.status as OrderStatus) : undefined,
      gateway: search.gateway && search.gateway !== "all" ? (search.gateway as Gateway) : undefined,
      page: search.page ?? 1,
      pageSize: PAGE_SIZE,
    }),
  );
  const update = (patch: Partial<OrderSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page }),
      // Filtering narrows what is already on screen; the Pager handles its own scrolling.
      resetScroll: false,
    });

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Orders"
        description={
          list.data
            ? `${formatNumber(list.data.total)} matching`
            : "Every checkout, on every gateway"
        }
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            value={search.q ?? ""}
            onCommit={(q) => update({ q: q || undefined })}
            placeholder="Org name, subscription id, order id, buyer email"
            className="lg:max-w-xl"
          />
          <Select
            value={search.gateway ?? "all"}
            onValueChange={(value) =>
              update({ gateway: value === "all" ? undefined : (value as OrderSearch["gateway"]) })
            }
          >
            <SelectTrigger className="h-9 w-full rounded-lg px-4 text-[13px] font-medium shadow-none lg:ml-auto lg:w-48">
              <SelectValue>
                {(value: (typeof GATEWAYS)[number]) => GATEWAY_LABELS[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GATEWAYS.map((gateway) => (
                <SelectItem key={gateway} value={gateway}>
                  {GATEWAY_LABELS[gateway]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FilterChips
          chips={STATUS_CHIPS}
          value={search.status ?? "all"}
          onChange={(status) => update({ status: status === "all" ? undefined : status })}
        />
      </div>

      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <EmptyState title="No orders match" description="Try a different search or filter." />
      ) : (
        <div className="flex flex-col gap-4">
          <ResponsiveTable rows={list.data.data} columns={COLUMNS} rowKey={(order) => order.id} />
          <Pager
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            fetching={list.isPlaceholderData}
            onPageChange={(page) => update({ ...search, page })}
          />
        </div>
      )}
    </div>
  );
}
