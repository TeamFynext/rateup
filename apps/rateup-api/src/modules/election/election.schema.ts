import { z } from "zod";

const mediaCore = {
  type: z.string(),
  name: z.string(),
  image: z.string(),
};
