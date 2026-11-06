import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Debounced online/offline transitions for inbox agents. */
export const userStatusQueue = new Queue("user-availability", { connection });
