import { randomBytes, randomInt } from "node:crypto";

/**
 * The alphabet is unchanged — the 52 ascii letters — but the draw is not.
 *
 * This used to be `Math.floor(Math.random() * 52)` per character. V8's
 * Math.random is xorshift128+, seeded once per context and carrying 128 bits of
 * state, so however long the output is made it cannot contain more than that,
 * and the state is recoverable from enough observed output. That matters here
 * because both callers mint credentials: the API access key
 * (apiAccessToken.service.ts) and the Zoho webhook secret
 * (zoho.controller.ts). randomInt draws from the CSPRNG and rejects the biased
 * tail of the range rather than taking a modulo. See issues.txt 46.1.
 */
export function generateRandomAlphaId(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, 52);
    result += String.fromCharCode(index + (index < 26 ? 65 : 71));
  }
  return result;
}

export function getUniqueRandomAlphaId(length: number, existingIds: string[]): string {
  let id = generateRandomAlphaId(length);
  while (existingIds.includes(id)) {
    id = generateRandomAlphaId(length);
  }
  return id;
}

/**
 * The alphabet short codes are drawn from: upper-case letters and digits with
 * I, O, 0 and 1 removed. Thirty-two symbols exactly, so each byte of randomness
 * maps to one character with no modulo bias.
 *
 * The confusable characters are dropped because these codes are read aloud and
 * typed in by hand at a till.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Draws `length` characters from CODE_ALPHABET using crypto.randomBytes.
 *
 * This is the one implementation. There used to be two: this file's, which drew
 * from a 36-character alphabet including the confusable I/O/0/1, and a private
 * copy inside redemption.service.ts which drew from the 32-character one above —
 * so two codes minted seconds apart by the same feature could not be told apart
 * by their shape, and only one of them was safe to read down a phone.
 *
 * Math.random was the other half of the problem: it is seeded predictably and is
 * not a source these codes should ever have come from, since a short code is what
 * a customer presents at a till to collect a reward. See issues.txt 20.9.
 */
export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET.charAt(bytes[i] % CODE_ALPHABET.length);
  }
  return result;
}

export function generateRewardShortCode(length: number = 8): string {
  return randomCode(length);
}
