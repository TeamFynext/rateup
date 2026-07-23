import { useCallback, useState } from "react";

export interface ListHandlers<T> {
  setState: React.Dispatch<React.SetStateAction<T[]>>;
  append: (...items: T[]) => void;
  prepend: (...items: T[]) => void;
  insert: (index: number, ...items: T[]) => void;
  remove: (...indices: number[]) => void;
  pop: () => void;
  shift: () => void;
  apply: (fn: (item: T, index?: number) => T) => void;
  applyWhere: (
    condition: (item: T, index?: number) => boolean,
    fn: (item: T, index?: number) => T,
  ) => void;
  setItem: (index: number, item: T) => void;
  setItemProp: <K extends keyof T>(index: number, prop: K, value: T[K]) => void;
  reorder: ({ from, to }: { from: number; to: number }) => void;
  filter: (fn: (item: T, i: number) => boolean) => void;
}

/** Replacement for `useListState` from `@mantine/hooks`. */
export function useListState<T>(initialValue: T[] = []): [T[], ListHandlers<T>] {
  const [state, setState] = useState(initialValue);

  const append = useCallback((...items: T[]) => setState((c) => [...c, ...items]), []);
  const prepend = useCallback((...items: T[]) => setState((c) => [...items, ...c]), []);

  const insert = useCallback(
    (index: number, ...items: T[]) =>
      setState((c) => [...c.slice(0, index), ...items, ...c.slice(index)]),
    [],
  );

  const apply = useCallback(
    (fn: (item: T, index?: number) => T) => setState((c) => c.map((item, i) => fn(item, i))),
    [],
  );

  const remove = useCallback(
    (...indices: number[]) => setState((c) => c.filter((_, i) => !indices.includes(i))),
    [],
  );

  const pop = useCallback(() => setState((c) => c.slice(0, -1)), []);
  const shift = useCallback(() => setState((c) => c.slice(1)), []);

  const reorder = useCallback(
    ({ from, to }: { from: number; to: number }) =>
      setState((c) => {
        const cloned = [...c];
        const item = c[from];
        cloned.splice(from, 1);
        cloned.splice(to, 0, item);
        return cloned;
      }),
    [],
  );

  const setItem = useCallback(
    (index: number, item: T) => setState((c) => c.map((v, i) => (i === index ? item : v))),
    [],
  );

  const setItemProp = useCallback(
    <K extends keyof T>(index: number, prop: K, value: T[K]) =>
      setState((c) => c.map((v, i) => (i === index ? { ...v, [prop]: value } : v))),
    [],
  );

  const applyWhere = useCallback(
    (condition: (item: T, index?: number) => boolean, fn: (item: T, index?: number) => T) =>
      setState((c) => c.map((item, i) => (condition(item, i) ? fn(item, i) : item))),
    [],
  );

  const filter = useCallback(
    (fn: (item: T, i: number) => boolean) => setState((c) => c.filter(fn)),
    [],
  );

  return [
    state,
    {
      setState,
      append,
      prepend,
      insert,
      pop,
      shift,
      apply,
      applyWhere,
      remove,
      reorder,
      setItem,
      setItemProp,
      filter,
    },
  ];
}
