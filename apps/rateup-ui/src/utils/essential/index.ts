/**
 * Chart series get their colour from the choice label. Numeric choices are
 * accepted and, as before, hash to the same constant colour — the loop simply
 * never runs for them.
 */
export const stringToColour = function (str: string | number) {
  let hash = 0;
  const text = typeof str === "string" ? str : undefined;
  for (let i = 0; i < (text?.length ?? 0); i++) {
    hash = text.codePointAt(i) || 0 + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).slice(-2);
  }
  return colour;
};

export function pushToSessionStorage(key: string, value: any) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function getFromSessionStorage(key: string) {
  const json = sessionStorage.getItem(key);
  if (json) {
    return JSON.parse(json);
  }
}
