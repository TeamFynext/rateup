export const getBrowserId = (): string => {
  if (globalThis.window === undefined) return "";
  let id = localStorage.getItem("browserId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("browserId", id);
  }
  return id;
};
