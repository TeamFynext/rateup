import { FastifyReply, FastifyRequest } from "fastify";
import { getIp } from "../../../utils/http";
import { tokenizeIp } from "./wa_redirect.service";

export async function tokenizeIpHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const ip = getIp(request);
    const token = await tokenizeIp(ip);
    reply.send({ token });
}