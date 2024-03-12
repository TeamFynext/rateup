import prisma from "../../../../utils/prisma";
import { updateLCustomer } from "../customer/customer.service";
import { CreateCustomerRewardEventInput } from "./cu_re.schema";

/**
 * Expected to be called automatically when a CampaignRewardEvent-record is created.
 */
// TODO: add as a trigger?
export async function createCustomerRewardEvent(
  event: CreateCustomerRewardEventInput,
) {
  const cure = await prisma.lCustomerRewardEvent.create({
    data: event,
  });

  if (cure.pointsEarned) {
    const {
      _sum: { pointsEarned },
    } = await prisma.lCustomerRewardEvent.aggregate({
      where: {
        customerId: cure.customerId,
      },
      _sum: {
        pointsEarned: true,
      },
    });

    await updateLCustomer(cure.customerId, {
      points: pointsEarned,
    });
  }

  return cure;
}
