import { randomBytes, randomInt } from "node:crypto";

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
