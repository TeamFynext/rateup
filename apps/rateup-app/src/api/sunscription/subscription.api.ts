import axios from "@/config/axios";
import { Subscription } from "./subscription.type";

const SUBSCRIPTION_URL = "/api/subscription"

export async function getUserSubscription() {
  return (await axios.get(`${SUBSCRIPTION_URL}`)).data as Subscription;
}