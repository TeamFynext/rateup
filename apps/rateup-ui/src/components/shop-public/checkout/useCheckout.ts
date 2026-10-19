import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getPublicCheckout,
  type PublicCheckout,
  type PublicCheckoutPatch,
  updatePublicCheckout,
} from "@/backend/commerce/shop.api";
import { retryUnlessNotFound } from "@/utils/apiError.ts";

export const publicCheckoutKey = (token: string) => ["public-checkout", token] as const;

const TYPING_DELAY_MS = 700;

/** Merges nested `customer` and `shippingAddress` so queued edits to different fields both land. */
function mergePatch(a: PublicCheckoutPatch, b: PublicCheckoutPatch): PublicCheckoutPatch {
  return {
    ...a,
    ...b,
    ...(a.customer || b.customer ? { customer: { ...a.customer, ...b.customer } } : {}),
  };
}

/**
 * The hosted checkout's state. The server prices everything, so every edit is a PATCH whose
 * answer replaces the cache; typed fields are batched with `queue`, clicks go out with `send`.
 */
export function useCheckout(token: string, justPaid: boolean) {
  const queryClient = useQueryClient();
  const key = publicCheckoutKey(token);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getPublicCheckout(token, { justPaid }),
    retry: retryUnlessNotFound,
    refetchOnWindowFocus: false,
    // Back from the gateway, the webhook can trail the redirect by a few seconds.
    refetchInterval: (q) =>
      justPaid && q.state.data?.order.status === "DRAFT" && q.state.dataUpdateCount < 6
        ? 4000
        : false,
  });

  // Only the newest answer is applied, so a slow reply cannot undo a later edit.
  const latest = useRef(0);
  // Clicks report their own failure where they happened; typed edits have no such place.
  const [typingError, setTypingError] = useState<unknown>(null);
  const mutation = useMutation({
    mutationFn: async (patch: PublicCheckoutPatch) => {
      const seq = ++latest.current;
      const data = await updatePublicCheckout(token, patch);
      return { seq, data };
    },
    onSuccess: ({ seq, data }) => {
      setTypingError(null);
      if (seq === latest.current) queryClient.setQueryData<PublicCheckout>(key, data);
    },
  });

  const pending = useRef<PublicCheckoutPatch | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync } = mutation;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = null;
    if (patch) await mutateAsync(patch);
  }, [mutateAsync]);

  const queue = useCallback(
    (patch: PublicCheckoutPatch) => {
      pending.current = mergePatch(pending.current ?? {}, patch);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush().catch(setTypingError), TYPING_DELAY_MS);
    },
    [flush],
  );

  const send = useCallback(
    (patch: PublicCheckoutPatch) => {
      pending.current = mergePatch(pending.current ?? {}, patch);
      return flush();
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { query, saving: mutation.isPending, typingError, queue, send, flush };
}
