import { FastifyRequest } from "fastify";

export function getIp(request: FastifyRequest) {
  let ip = request.ip;
  const forwardedFor = (request.headers["x-forwarded-for"] as string) || undefined;

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

/**
 * An Error that carries the HTTP status a handler should reply with, replacing the
 * `const error: any = new Error(); error.statusCode = ...` pattern.
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}
