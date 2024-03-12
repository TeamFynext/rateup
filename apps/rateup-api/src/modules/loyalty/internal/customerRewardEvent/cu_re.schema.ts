import { LCustomerRewardEvent } from "@prisma/client";

export type CreateCustomerRewardEventInput = Omit<
  LCustomerRewardEvent,
  "id" | "createdAt"
>;
