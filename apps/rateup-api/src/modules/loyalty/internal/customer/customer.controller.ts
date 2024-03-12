import { FastifyRequest, FastifyReply } from "fastify";
import {
  BylCustomerIdParam,
  CreateLCustomerInput,
  UpdateLCustomerInput,
} from "./customer.schema";
import {
  createLCustomer,
  deleteLCustomer,
  getLCustomerById,
  getLCustomersByOrg,
  updateLCustomer,
} from "./customer.service";
import { ByOrgIdParams } from "../../../org/org.schema";

export async function createLCustomerHandler(
  req: FastifyRequest<{
    Body: CreateLCustomerInput;
  }>,
  res: FastifyReply,
) {
  const orgId = req.user.orgId;
  const customer = await createLCustomer({ ...req.body, orgId });
  res.send(customer);
}

export async function getLCustomersByOrgHandler(
  req: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  res: FastifyReply,
) {
  const customers = await getLCustomersByOrg(req.params.orgId);
  res.send(customers);
}

export async function getLCustomerByIdHandler(
  req: FastifyRequest<{ Params: BylCustomerIdParam }>,
  res: FastifyReply,
) {
  const customer = await getLCustomerById(req.params.lCustomerId);
  res.send(customer);
}

export async function updateLCustomerHandler(
  req: FastifyRequest<{
    Params: BylCustomerIdParam;
    Body: UpdateLCustomerInput;
  }>,
  res: FastifyReply,
) {
  const customer = await updateLCustomer(req.params.lCustomerId, req.body);
  res.send(customer);
}
export async function deleteLCustomerHandler(
  req: FastifyRequest<{ Params: BylCustomerIdParam }>,
  res: FastifyReply,
) {
  const customer = await deleteLCustomer(req.params.lCustomerId);
  res.send(customer);
}
