// Websocket fan-out for worker processes.
//
// Workers have no websocket connections of their own — the API holds those. Both
// sides meet on the `ws:messages` Redis pub/sub channel: the API's ws controller
// subscribes to it and forwards each payload to the sockets for that org.
// Publishing needs a connection in "subscriber-free" mode, hence the duplicate.
import baseRedis from "../../utils/redisConnection.js";

export const WS_CHANNEL = "ws:messages";

export const publisher = baseRedis.duplicate();
