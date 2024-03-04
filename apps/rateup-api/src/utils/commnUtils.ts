import { customAlphabet } from "nanoid";
import { nolookalikesSafe } from "nanoid-dictionary";

const getShortUrlId = () => {
  return customAlphabet(nolookalikesSafe, 8)();
};

export { getShortUrlId };
