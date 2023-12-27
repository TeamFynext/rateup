import { getSubscription } from "./subscription.service";

export async function getSubscriptionHandler(req, res) {
    const { orgId } = req.user;
    const subscription = await getSubscription(orgId);
    if (!subscription) {
        return res.status(404).send({
            message: 'Subscription not found'
        });
    }
    return res.send(subscription);
}