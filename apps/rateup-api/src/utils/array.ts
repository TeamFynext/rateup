export function arrayEquals(a: Array<string>, b: Array<string>) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => b.includes(val));
  }