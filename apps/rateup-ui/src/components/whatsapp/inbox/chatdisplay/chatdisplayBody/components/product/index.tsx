import { IconPackage } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatMoney, getShopProducts, getShopStore } from "@/backend/commerce/shop.api";
import { shopKeys } from "@/backend/commerce/shop.query";
import { Skeleton } from "@/components/ui/skeleton.tsx";

/**
 * The catalog items a WhatsApp product message carried. The message names them by retailer id
 * only, so they are looked up in the shop; someone who can't read the shop sees a count.
 */
export default function ChatProductList({ retailerIds }: Readonly<{ retailerIds: string[] }>) {
  const { t } = useTranslation();
  const query = { retailerIds: retailerIds.join(","), limit: 30 };
  const products = useQuery({
    queryKey: shopKeys.products(query),
    queryFn: () => getShopProducts(query),
    enabled: retailerIds.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const store = useQuery({
    queryKey: shopKeys.store(),
    queryFn: getShopStore,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (products.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        {retailerIds.slice(0, 3).map((id) => (
          <Skeleton key={id} className="h-11" />
        ))}
      </div>
    );
  }

  const rows = retailerIds.flatMap((id) => {
    for (const product of products.data?.items ?? []) {
      const variant = product.variants.find((v) => v.retailerId === id);
      if (variant) return [{ id, product, variant }];
    }
    return [];
  });
  const unknown = retailerIds.length - rows.length;

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map(({ id, product, variant }) => {
        const image = variant.imageUrl ?? product.images[0];
        return (
          <li key={id} className="flex items-center gap-2.5 rounded-md bg-muted/60 p-1.5">
            {image ? (
              <img src={image} alt="" className="size-9 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded bg-muted">
                <IconPackage className="size-4 text-muted-foreground" />
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {product.variants.length > 1
                  ? `${product.title} · ${variant.title}`
                  : product.title}
              </span>
              {store.data && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(variant.price, store.data.currency)}
                </span>
              )}
            </span>
          </li>
        );
      })}
      {unknown > 0 && (
        <li className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconPackage className="size-4 shrink-0" />
          {rows.length
            ? t("{count, plural, one {# more catalog item} other {# more catalog items}}", {
                count: unknown,
              })
            : t("{count, plural, one {# catalog item} other {# catalog items}}", {
                count: unknown,
              })}
        </li>
      )}
    </ul>
  );
}
