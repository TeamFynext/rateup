import { Prisma } from "../../generated/prisma/client.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { customAlphabet } from "nanoid";
import { nolookalikesSafe } from "nanoid-dictionary";

const getShortUrlId = () => {
  return customAlphabet(nolookalikesSafe, 8)();
};

const MAX_SHORT_ID_ATTEMPTS = 5;

const shortIdUniqueConstraintErrHandler = async <R>(
  functionToBeHandled: (...args: unknown[]) => R | Promise<R>,
  ...args: unknown[]
): Promise<R> => {
  return shortIdRetry(functionToBeHandled, MAX_SHORT_ID_ATTEMPTS, ...args);
};

const shortIdRetry = async <R>(
  functionToBeHandled: (...args: unknown[]) => R | Promise<R>,
  attemptsLeft: number,
  ...args: unknown[]
): Promise<R> => {
  try {
    return await functionToBeHandled(...args);
  } catch (err) {
    console.log("err from shortidurluniqueconstrainterrorhandler", err);
    const target =
      err instanceof Prisma.PrismaClientKnownRequestError ? err.meta?.target : undefined;
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(target) &&
      target.includes("shortUrlId") &&
      attemptsLeft > 1
    ) {
      // ...args forwarded: the retry used to re-invoke the wrapped function with
      // nothing at all, so a short-id collision recreated the row from undefined inputs.
      return shortIdRetry(functionToBeHandled, attemptsLeft - 1, ...args);
    } else {
      throw err;
    }
  }
};

const asyncErrHandler = <Req extends FastifyRequest = FastifyRequest>(
  functionToBeHandled: (req: Req, rep: FastifyReply) => Promise<void> | void,
): ((req: Req, rep: FastifyReply) => Promise<void>) => {
  return async (req: Req, rep: FastifyReply) => {
    try {
      await functionToBeHandled(req, rep);
    } catch (err) {
      console.log(err);
      rep.code(500).send({
        success: false,
        message: "something went wrong, please try again later",
      });
    }
  };
};

const isEmptyString = (str: string | undefined): string | null =>
  !str || !str.trim().length ? null : str;

/** Reads `.message` off a thrown value without assuming it is an Error. */
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export {
  asyncErrHandler,
  getShortUrlId,
  shortIdUniqueConstraintErrHandler,
  isEmptyString,
  errorMessage,
};
