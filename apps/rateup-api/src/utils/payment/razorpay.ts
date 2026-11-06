import Razorpay from "razorpay";

let instance: Razorpay | undefined;

/**
 * RateUp's own Razorpay account (plans and subscriptions), created on first use.
 *
 * Not at module load: the SDK throws when `key_id` is missing, and the bullmq worker, which
 * has no Razorpay keys, loads this file through the Update Center task list. Constructing it
 * eagerly crashed the worker at startup.
 */
export function getRazorpay(): Razorpay {
  instance ??= new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
  });
  return instance;
}
