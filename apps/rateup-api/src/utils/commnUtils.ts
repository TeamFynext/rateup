import { Prisma } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import { customAlphabet } from "nanoid";
import { nolookalikesSafe } from "nanoid-dictionary";

const getShortUrlId = () => {
  return customAlphabet(nolookalikesSafe, 8)();
};

const shortIdUniqueConstraintErrHandler = async (
  functionToBeHandled,
  ...args
) => {
  try {
    return await functionToBeHandled(...args);
  } catch (err) {
    console.log("err from shortidurluniqueconstrainterrorhandler", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      // @ts-ignore
      err.meta.target?.includes("shortUrlId")
    ) {
      return shortIdUniqueConstraintErrHandler(functionToBeHandled);
    } else {
      throw err;
    }
  }
};

const asyncErrHandler = (
  functionToBeHandled,
): ((req: FastifyRequest, rep: FastifyReply) => void) => {
  return async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      await functionToBeHandled(req, rep);
    } catch (err) {
      rep.code(500).send({
        success: false,
        message: "unable to get data",
      });
    }
  };
};

export { asyncErrHandler, getShortUrlId, shortIdUniqueConstraintErrHandler };
