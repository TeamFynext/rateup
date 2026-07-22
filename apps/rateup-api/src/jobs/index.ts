async function registerWorkers() {
  await import("./user.worker.js");
  await import("./pausedAutomation.worker.js");
  await import("./webhook.worker.js");
  await import("./notification.worker.js");
  await import("./outgoingWebhook.worker.js");
  await import("./integration.worker.js");
  await import("./sendMessage.worker.js");
  await import("../modules/update/update.backfill.queue.js");
}

export default registerWorkers;
