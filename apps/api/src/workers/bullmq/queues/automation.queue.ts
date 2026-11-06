import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Resumes an inbox automation after its configured pause elapses. */
export const pausedAutomationQueue = new Queue("pausedAutomationQueue", { connection });
