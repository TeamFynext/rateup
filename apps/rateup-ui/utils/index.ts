export function getTimeSince(date: string) {
  //@ts-ignore
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval >= 1) {
    return `${interval} year${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return `${interval} month${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 2) {
    return `${interval} days ago`;
  } else if (interval === 1) {
    return "Yesterday";
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return `${interval} hour${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return `${interval} minute${interval === 1 ? "" : "s"} ago`;
  }

  return `${Math.floor(seconds)} second${
    Math.floor(seconds) === 1 ? "" : "s"
  } ago`;
}

export function arrayEquals<T extends string | number>(
  a: Array<T>,
  b: Array<T>,
) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => b.includes(val));
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
