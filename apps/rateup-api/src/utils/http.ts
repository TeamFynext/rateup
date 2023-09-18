import { FastifyRequest } from "fastify";

export function getIp(request: FastifyRequest) {
    let ip = request.ip
    const forwardedFor = request.headers["x-forwarded-for"] as string || undefined;

    if (forwardedFor) {
        const ips = forwardedFor.split(",");
        ip = ips[ips.length - 1];
    }

    return ip
}