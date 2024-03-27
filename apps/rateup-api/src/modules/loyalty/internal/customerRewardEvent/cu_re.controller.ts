import { FastifyRequest } from "fastify/types/request";
import { BylCustomerIdParam } from "../customer/customer.schema";
import { FastifyReply } from "fastify";
import { getCustomerRewardEventsByCustomerId } from "./cu_re.service";

export async function getCustomerRewardEvents_byCustomerIdHandler(
  req: FastifyRequest<{
    Params: BylCustomerIdParam;
  }>,
  rep: FastifyReply,
) {
  const { lCustomerId } = req.params;
  const customerRewardEvents =
    await getCustomerRewardEventsByCustomerId(lCustomerId);
  rep.send(customerRewardEvents);
}
