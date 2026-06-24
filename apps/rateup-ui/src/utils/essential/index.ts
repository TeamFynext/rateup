export const stringToColour = function (str: string) {
  let hash = 0;
  for (let i = 0; i < str?.length; i++) {
    hash = str.codePointAt(i) || 0 + ((hash << 5) - hash);
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
