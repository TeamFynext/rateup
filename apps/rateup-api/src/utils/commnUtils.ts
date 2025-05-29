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
      console.log(err);
      rep.code(500).send({
        success: false,
        message: "something went wrong, please try again later",
      });
    }
  };
};

const isEmptyString = (str: string): string | null =>
  !str || !str.trim().length ? null : str;

export {
  asyncErrHandler,
  getShortUrlId,
  shortIdUniqueConstraintErrHandler,
  isEmptyString,
};
