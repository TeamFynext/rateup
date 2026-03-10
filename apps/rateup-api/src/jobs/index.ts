async function registerWorkers() {
  await import("./pausedAutomation.worker.js");
  await import("./webhook.worker.js");
  await import("./notification.worker.js");
}

export default registerWorkers;
