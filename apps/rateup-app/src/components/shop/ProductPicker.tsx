import { Check, Minus, Package, Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { shopErrorMessage } from "@/api/shop/shop.api";
import { useSellableProducts } from "@/api/shop/shop.query";
import type { ChatChannel, ShopProduct, ShopVariant } from "@/api/shop/shop.type";
import Image from "@/components/common/Image";
import SearchField from "@/components/common/SearchField";
import { useDebounced } from "@/components/loyalty/cashier/useDebounced";
import {
  Badge,
  EmptyState,
  FONT,
  InlineError,
  NUM,
  useTheme,
} from "@/components/loyalty/cashier/ui";

import { isSoldOut, money, variantLabel } from "./orderFormat";

/** What a cart line needs to price and render itself after the search has moved on. */
export interface PickedLine {
  variantId: string;
  title: string;
  variantTitle: string | null;
  price: number;
  quantity: number;
}

/** Why WhatsApp would skip this product — it only sends what is live in the Meta catalog. */
function notOnChannel(product: ShopProduct, channel: ChatChannel): string | null {
  if (channel === "WHATSAPP") {
    if (!product.showOnWhatsapp) return "Hidden on WhatsApp";
    if (product.metaSyncStatus !== "LIVE") return "Not in catalog yet";
  }
  if (channel === "INSTAGRAM" && !product.showOnInstagram) return "Hidden on Instagram";
  if (channel === "MESSENGER" && !product.showOnFacebook) return "Hidden on Messenger";
  return null;
}

type Row =
  | { kind: "product"; product: ShopProduct }
  | { kind: "variant"; product: ShopProduct; variant: ShopVariant };

export default function ProductPicker({
  mode,
  channel,
  currency,
  selected,
  onToggle,
  lines,
  onQuantity,
  footer,
}: Readonly<{
  /** `send` picks whole products; `order` picks variants with quantities. */
  mode: "send" | "order";
  channel: ChatChannel;
  currency: string;
  selected?: readonly string[];
  onToggle?: (product: ShopProduct) => void;
  lines?: Readonly<Record<string, PickedLine>>;
  onQuantity?: (line: PickedLine) => void;
  footer?: React.ReactElement;
}>) {
  const { t } = useTheme();
  const [search, setSearch] = useState("");
  const settled = useDebounced(search);
  const { data, isLoading, isError, error } = useSellableProducts(settled);

  const rows = useMemo<Row[]>(() => {
    const products = data?.items ?? [];
    if (mode === "send") return products.map((product) => ({ kind: "product", product }));
    return products.flatMap((product) =>
      product.variants.map((variant) => ({ kind: "variant" as const, product, variant })),
    );
  }, [data, mode]);

  const renderRow = ({ item }: { item: Row }) => {
    const { product } = item;
    const variant = item.kind === "variant" ? item.variant : product.variants[0];
    const image = (item.kind === "variant" && item.variant.imageUrl) || product.images[0];
    const price = Number(variant?.price ?? 0);
    const subtitle = item.kind === "variant" ? variantLabel(item.variant) : null;
    const warning = mode === "send" ? notOnChannel(product, channel) : null;
    const soldOut = item.kind === "variant" && isSoldOut(item.variant);

    const picked = mode === "send" && Boolean(selected?.includes(product.id));
    const line = item.kind === "variant" ? lines?.[item.variant.id] : undefined;
    const quantity = line?.quantity ?? 0;

    const setQuantity = (next: number) => {
      if (item.kind !== "variant" || !onQuantity) return;
      onQuantity({
        variantId: item.variant.id,
        title: product.title,
        variantTitle: subtitle,
        price,
        quantity: Math.max(0, Math.min(999, next)),
      });
    };

    const onPress = () => {
      if (mode === "send") onToggle?.(product);
      else if (!soldOut && quantity === 0) setQuantity(1);
    };

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={mode === "send" ? "checkbox" : "button"}
        accessibilityState={mode === "send" ? { checked: picked } : { disabled: soldOut }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: picked || quantity > 0 ? t.brandSoft : "transparent",
          borderBottomWidth: 1,
          borderBottomColor: t.rowDivider,
          opacity: soldOut ? 0.5 : 1,
        }}
      >
        {image ? (
          <Image
            source={{ uri: image }}
            contentFit="cover"
            style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: t.surface2 }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: t.surface2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={20} color={t.fg4} />
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
            {product.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
            {[subtitle, money(price, currency), soldOut ? "Sold out" : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {warning ? <Badge label={warning} tone="warm" /> : null}
        </View>

        {mode === "send" ? (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              borderWidth: picked ? 0 : 1.5,
              borderColor: t.border1,
              backgroundColor: picked ? t.brandInk : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {picked ? <Check size={15} color="#FFFFFF" /> : null}
          </View>
        ) : quantity > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <StepButton label="Remove one" onPress={() => setQuantity(quantity - 1)}>
              <Minus size={15} color={t.fg1} />
            </StepButton>
            <Text
              style={{
                ...NUM,
                minWidth: 22,
                textAlign: "center",
                fontFamily: FONT.bold,
                fontSize: 15,
                color: t.fg1,
              }}
            >
              {quantity}
            </Text>
            <StepButton label="Add one" onPress={() => setQuantity(quantity + 1)}>
              <Plus size={15} color={t.fg1} />
            </StepButton>
          </View>
        ) : soldOut ? null : (
          <Plus size={18} color={t.brand} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 }}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search products" />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === "variant" ? row.variant.id : row.product.id)}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={t.brand} />
            </View>
          ) : isError ? (
            <View style={{ padding: 16 }}>
              <InlineError message={shopErrorMessage(error, "Could not load products")} />
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              <EmptyState
                title={settled ? "No products match" : "No products for sale"}
                body={settled ? undefined : "Add active products to your shop on the web first."}
              />
            </View>
          )
        }
        ListFooterComponent={footer}
      />
    </View>
  );
}

function StepButton({
  label,
  onPress,
  children,
}: Readonly<{ label: string; onPress: () => void; children: React.ReactNode }>) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: t.border1,
        backgroundColor: t.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Pressable>
  );
}
