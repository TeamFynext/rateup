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
    <div className={classes.order_wrapper}>
      <div className={classes.order_header}>
        <ShoppingCart size={20} />
        <p className="font-semibold text-sm">Order Placed</p>
      </div>

      {products.length > 0 && (
        <div className={classes.order_products}>
          {products.map((product, index) => (
            <div key={index} className={classes.order_product_item}>
              <p className="text-sm">
                Item #{product.retailerId} × {product.quantity}
              </p>
              <p className="text-sm font-medium">
                {currency} {(product.price * product.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {totalAmount > 0 && (
        <div className={classes.order_total}>
          <p className="font-semibold text-sm">Total:</p>
          <p className="font-semibold text-sm">
            {currency} {totalAmount.toFixed(2)}
          </p>
        </div>
      )}

      {messageContent && (
        <p className="text-[10px] text-gray-500 mt-2">{messageContent}</p>
      )}
    </div>
  );
}
