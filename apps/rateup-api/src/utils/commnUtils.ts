import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { nolookalikesSafe } from "nanoid-dictionary";

const getShortUrlId = () => {
  return customAlphabet(nolookalikesSafe, 8)();
};

const shortIdUniqueConstraintErrHandler = async (functionToBeHandled) => {
  try {
    return await functionToBeHandled();
  } catch (err) {
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

export { getShortUrlId, shortIdUniqueConstraintErrHandler };
