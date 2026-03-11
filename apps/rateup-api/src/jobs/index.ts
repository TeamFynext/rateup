async function registerWorkers() {
  await import("./user.worker.js");
  await import("./pausedAutomation.worker.js");
  await import("./webhook.worker.js");
  await import("./notification.worker.js");
}

export default registerWorkers;
