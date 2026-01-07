import { Box, Text } from "@mantine/core";
import { ShoppingCart } from "lucide-react";

import classes from "./styles.module.css";

interface OrderProduct {
  retailerId: string;
  quantity: number;
  price: number;
  currency: string;
}

interface Props {
  messageContent: string;
  orderData?: {
    products: OrderProduct[];
    catalogId: string;
  };
}

export default function WaInboxOrder(props: Props) {
  const { messageContent, orderData } = props;

  // Parse order data if available
  const products = orderData?.products || [];
  const totalAmount = products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0,
  );
  const currency = products[0]?.currency || "USD";

  return (
    <Box className={classes.order_wrapper}>
      <div className={classes.order_header}>
        <ShoppingCart size={20} />
        <Text fw={600} size="sm">
          Order Placed
        </Text>
      </div>

      {products.length > 0 && (
        <div className={classes.order_products}>
          {products.map((product, index) => (
            <div key={index} className={classes.order_product_item}>
              <Text size="sm">
                Item #{product.retailerId} × {product.quantity}
              </Text>
              <Text size="sm" fw={500}>
                {currency} {(product.price * product.quantity).toFixed(2)}
              </Text>
            </div>
          ))}
        </div>
      )}

      {totalAmount > 0 && (
        <div className={classes.order_total}>
          <Text fw={600} size="sm">
            Total:
          </Text>
          <Text fw={600} size="sm">
            {currency} {totalAmount.toFixed(2)}
          </Text>
        </div>
      )}

      {messageContent && (
        <Text size="xs" c="dimmed" mt="xs">
          {messageContent}
        </Text>
      )}
    </Box>
  );
}
