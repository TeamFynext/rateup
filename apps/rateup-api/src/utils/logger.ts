const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  production: true,
  test: false,
};
let NODE_ENV;
if (!process.env.NODE_ENV) {
  NODE_ENV = "production";
} else {
  NODE_ENV = process.env.NODE_ENV;
}
// @ts-ignore
export const logger: any = envToLogger[NODE_ENV] ?? true;
