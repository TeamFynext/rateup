import { CheckCircle2 } from "lucide-react-native";
import React, { useState } from "react";
import { Text, View } from "react-native";

import { shopErrorMessage } from "@/api/shop/shop.api";
import { useSendProducts, useShopStore } from "@/api/shop/shop.query";
import type { ChatChannel, SendProductsResult, ShopProduct } from "@/api/shop/shop.type";
import {
  CashierButton,
  CashierInput,
  FONT,
  InlineError,
  useTheme,
} from "@/components/loyalty/cashier/ui";

import ProductPicker from "./ProductPicker";
import ShopSheet from "./ShopSheet";

/** The API's cap on product cards in one send. */
const MAX_PRODUCTS = 30;

export default function SendProductsSheet({
  visible,
  onClose,
  contactId,
  channel,
  channelAccountId,
}: Readonly<{
  visible: boolean;
  onClose: () => void;
  contactId: string;
  channel: ChatChannel;
  channelAccountId: string | null;
}>) {
  const { t } = useTheme();
  const { data: store } = useShopStore(visible);
  const send = useSendProducts();
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendProductsResult | null>(null);

  const close = () => {
    setSelected([]);
    setText("");
    setError(null);
    setResult(null);
    send.reset();
    onClose();
  };

  const toggle = (product: ShopProduct) => {
    setError(null);
    setSelected((current) =>
      current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : current.length >= MAX_PRODUCTS
          ? current
          : [...current, product.id],
    );
  };

  const submit = async () => {
    setError(null);
    try {
      const outcome = await send.mutateAsync({
        contactId,
        channel,
        channelAccountId,
        productIds: selected,
        text: text.trim() || undefined,
      });
      setResult(outcome);
    } catch (e) {
      setError(shopErrorMessage(e, "Could not send the products"));
    }
  };

  if (result) {
    return (
      <ShopSheet
        visible={visible}
        title="Products sent"
        onClose={close}
        footer={<CashierButton label="Done" onPress={close} />}
      >
        <View style={{ padding: 24, alignItems: "center", gap: 10 }}>
          <CheckCircle2 size={40} color={t.success} />
          <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: t.fg1, textAlign: "center" }}>
            {result.sent === 1 ? "1 product sent" : `${result.sent} products sent`}
          </Text>
          {result.skipped > 0 ? (
            <Text
              style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, textAlign: "center" }}
            >
              {result.skipped === 1
                ? "1 product was skipped because it isn't available on this channel."
                : `${result.skipped} products were skipped because they aren't available on this channel.`}
            </Text>
          ) : null}
        </View>
      </ShopSheet>
    );
  }

  return (
    <ShopSheet
      visible={visible}
      title="Send products"
      subtitle={
        selected.length ? `${selected.length} selected` : "Pick up to 30 to send as product cards"
      }
      onClose={close}
      footer={
        <>
          <InlineError message={error} />
          <CashierInput
            value={text}
            onChangeText={setText}
            placeholder="Add a message (optional)"
            maxLength={1000}
          />
          <CashierButton
            label={selected.length > 1 ? `Send ${selected.length} products` : "Send product"}
            onPress={submit}
            disabled={!selected.length}
            loading={send.isPending}
          />
        </>
      }
    >
      <ProductPicker
        mode="send"
        channel={channel}
        currency={store?.currency ?? ""}
        selected={selected}
        onToggle={toggle}
      />
    </ShopSheet>
  );
}
