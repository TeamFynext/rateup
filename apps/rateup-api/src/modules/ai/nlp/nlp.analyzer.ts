/**
 * This module is responsible for analyzing text using Google's NLP API
 */

import nlp from "@google-cloud/language";
import fs from "node:fs";
import prisma from "../../../utils/prisma.js";

fs.writeFileSync("./nlp_auth.json", process.env.NLP_AUTH || "");

// Instantiates a client
const nlp_client = new nlp.v1beta2.LanguageServiceClient();

async function annotateText(text: string) {
  const result = await nlp_client.annotateText(
    {
      document: {
        type: "PLAIN_TEXT",
        content: text,
      },
      features: {
        extractDocumentSentiment: true,
        extractEntities: true,
        extractEntitySentiment: true,
        classifyText: false,
        moderateText: false,
      },
    },
    {},
  );
  return result[0];
}

export async function memoizedAnnotateText(text: string) {
  const existing = await prisma.nLP_Cache.findUnique({
    where: {
      text,
    },
  });
  if (existing) {
    return { result: existing.result, fromCache: true };
  } else {
    const result = await annotateText(text);
    await prisma.nLP_Cache.create({
      data: {
        text,
        result: result as any,
      },
    });
    return { result, fromCache: false };
  }
}
