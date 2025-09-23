import { FastifyRequest } from "fastify";

export function getIp(request: FastifyRequest) {
  let ip = request.ip;
  const forwardedFor =
    (request.headers["x-forwarded-for"] as string) || undefined;

  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    ip = ips[0];
  }

  return ip;
}

export function getCookieValue(cookieName: string, cookie: string) {
  if (!cookie) {
    return undefined;
  }
  const cookies = cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return value;
    }
  }
  return undefined;
}
