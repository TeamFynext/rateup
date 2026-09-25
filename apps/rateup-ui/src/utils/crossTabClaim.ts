const HOLD_MS = 10_000;
const STORAGE_PREFIX = "rateup:tab-claim:";

/**
 * Resolves true in one tab per key: the first to ask within HOLD_MS. The Web Lock is held
 * that long so tabs that receive the same event a little later find it taken.
 */
export async function claimAcrossTabs(key: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    try {
      return await new Promise<boolean>((resolve, reject) => {
        navigator.locks
          .request(STORAGE_PREFIX + key, { ifAvailable: true }, (lock) => {
            resolve(lock !== null);
            return lock ? new Promise((done) => setTimeout(done, HOLD_MS)) : undefined;
          })
          .catch(reject);
      });
    } catch {
      return claimInStorage(key);
    }
  }
  return claimInStorage(key);
}

/** Best-effort fallback for browsers without Web Locks; two tabs may both win a close race. */
function claimInStorage(key: string): boolean {
  try {
    const storageKey = STORAGE_PREFIX + key;
    const claimedAt = Number(localStorage.getItem(storageKey));
    if (claimedAt && Date.now() - claimedAt < HOLD_MS) return false;
    localStorage.setItem(storageKey, String(Date.now()));
    setTimeout(() => {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }, HOLD_MS);
    return true;
  } catch {
    return true;
  }
}
