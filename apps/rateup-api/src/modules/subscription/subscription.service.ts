import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { SampleSubscriptionFeatures } from "./subscription.data";

export async function createTrialSubscription(orgId: string, pClient = prisma) {
    await pClient.subscription.create({
        data: {
            orgId,
            features: SampleSubscriptionFeatures,
            expiresAt: dayjs().add(7, 'day').toDate(),
        }
    })
}

export async function getSubscription(orgId: string) {
    return await prisma.subscription.findFirst({
        where: {
            orgId
        }
    })
}
