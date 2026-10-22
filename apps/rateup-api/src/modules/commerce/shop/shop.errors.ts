export type ShopErrorCode =
  | "NOT_FOUND"
  | "INVALID"
  | "OUT_OF_STOCK"
  | "DISCOUNT_INVALID"
  | "PAYMENT_UNAVAILABLE"
  | "PAYMENT_FAILED"
  | "CHECKOUT_EXPIRED"
  | "CONFLICT"
  | "PLAN_REQUIRED"
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "ORDER_LIMIT";

const STATUS: Record<ShopErrorCode, number> = {
  NOT_FOUND: 404,
  INVALID: 400,
  OUT_OF_STOCK: 409,
  DISCOUNT_INVALID: 422,
  PAYMENT_UNAVAILABLE: 422,
  PAYMENT_FAILED: 502,
  CHECKOUT_EXPIRED: 410,
  CONFLICT: 409,
  PLAN_REQUIRED: 403,
  FORBIDDEN: 403,
  LIMIT_REACHED: 429,
  ORDER_LIMIT: 403,
};

/** Thrown by shop services; the shop route plugins turn it into `{ code, message }`. */
export class ShopError extends Error {
  readonly code: ShopErrorCode;
  readonly statusCode: number;
  constructor(code: ShopErrorCode, message: string) {
    super(message);
    this.name = "ShopError";
    this.code = code;
    this.statusCode = STATUS[code];
  }
}

export const notFound = (what: string) => new ShopError("NOT_FOUND", `${what} not found`);
