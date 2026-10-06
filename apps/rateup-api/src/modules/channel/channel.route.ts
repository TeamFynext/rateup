import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { declareAccess } from "../../authz/registry.js";
import { getAccessibleChannels } from "./channel.service.js";
import { type ChannelListQuery, channelListQuerySchema } from "./channel.schema.js";

/**
 * Every connected channel the viewer's teams reach, of every platform. Connecting and
 * disconnecting stay with each platform (`/api/wa/auth`, `/api/meta/channels`), since each
 * has its own login and teardown.
 */
export async function channelRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "channels.read", write: "channels.manage" });

  server.get(
    "/",
    { schema: { querystring: channelListQuerySchema } },
    async (req: FastifyRequest<{ Querystring: ChannelListQuery }>, reply: FastifyReply) =>
      reply.send(await getAccessibleChannels(req.actor!, req.query.platform)),
  );
}
