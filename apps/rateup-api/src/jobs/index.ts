async function registerWorkers() {
  await import("./user.worker.js");
  await import("./pausedAutomation.worker.js");
  await import("./webhook.worker.js");
  await import("./notification.worker.js");
  await import("./outgoingWebhook.worker.js");
  await import("./integration.worker.js");
}

export default registerWorkers;
