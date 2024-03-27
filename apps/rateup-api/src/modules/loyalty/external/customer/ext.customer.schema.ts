import { buildJsonSchemas } from "fastify-zod";
import {
  bylCustomerIdParamSchema,
  LCustomerSchema,
  createLCustomerSchema,
  updateLCustomerSchema,
} from "../../internal/customer/customer.schema";

export const { schemas: extLCustomerSchemas, $ref: $extLCustomerRef } =
  buildJsonSchemas(
    {
      bylCustomerIdParamSchema,
      LCustomerSchema,
      createLCustomerSchema,
      updateLCustomerSchema,
    },
    { $id: "extLCustomer" },
  );
