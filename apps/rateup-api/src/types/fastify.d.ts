import "fastify";

declare module "fastify" {
  interface FastifyContextConfig {
    fallbackEmptyArray?: boolean;
  }
}
