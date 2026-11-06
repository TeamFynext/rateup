function generateRandomAlphaId(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    let ascii = Math.floor(Math.random() * 52);
    ascii += ascii < 26 ? 65 : 71;
    result += String.fromCharCode(ascii);
  }
  return result;
}

export function getUniqueRandomAlphaId(length: number, existingIds: string[]): string {
  let id = generateRandomAlphaId(length);
  while (existingIds?.includes(id)) {
    id = generateRandomAlphaId(length);
  }
  return id;
}
